import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getBroker, credsFromRequest } from "@/lib/broker";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/user";
import { executeSchema } from "@/lib/order-schema";
import { checkOrder } from "@/lib/rules/engine";
import type { ClauseRule, MarketData, OrderDraft } from "@/lib/rules/types";
import { computeHoldMin, computePnlPct, triggerReport } from "@/lib/trades";

/**
 * POST /api/order/execute — 주문 실행. [owner: P1]
 *
 *   1. body → ExecuteInput (zod)
 *   2. precheck 재확인: block 위반인데 forceReason 없으면 422
 *   3. broker.placeOrder → getFill
 *   4. Order 저장 + Trade 수명주기(매수=OPEN/평단 갱신, 매도=CLOSED+손익·보유시간)
 *   5. 청산이면 P3 보고서 트리거(best-effort)
 */
export async function POST(req: NextRequest) {
  const parsed = executeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 주문 형식", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const broker = getBroker(credsFromRequest(req));
  const user = await getDemoUser();

  // 2. precheck 재확인 (서버 신뢰 — 클라이언트 우회 방지)
  const quote = await broker.getQuote(input.market, input.symbol);
  const marketData: MarketData = {
    price: quote.price,
    prevClose: quote.prevClose,
    changePct: quote.changePct,
    volume: quote.volume,
    isPremarket: quote.isPremarket,
  };
  const clauseRows = await prisma.clause.findMany({
    where: { userId: user.id, active: true },
  });
  const clauses: ClauseRule[] = clauseRows.map((c) => ({
    id: c.id,
    ruleType: c.ruleType,
    params: (c.params ?? {}) as Record<string, unknown>,
    displayText: c.displayText,
  }));
  const order: OrderDraft = {
    market: input.market,
    symbol: input.symbol,
    side: input.side,
    orderType: input.orderType,
    quantity: input.quantity,
    price: input.price,
    stopPrice: input.stopPrice,
  };
  const precheck = checkOrder(order, marketData, clauses);
  const blocking = precheck.violations.filter((v) => v.severity === "block");
  if (blocking.length > 0 && !input.forceReason?.trim()) {
    return NextResponse.json(
      { error: "유언장 위반 — 강행 사유(forceReason)가 필요합니다.", violations: precheck.violations },
      { status: 422 },
    );
  }

  // 3. 브로커 주문 → 체결
  const ack = await broker.placeOrder({
    market: input.market,
    symbol: input.symbol,
    side: input.side,
    orderType: input.orderType,
    quantity: input.quantity,
    price: input.price,
  });
  const fill = await broker.getFill(ack.brokerOrderId);

  // 위반 스냅샷(서버 재계산본 우선, 없으면 클라이언트 전달본)
  const violationsSnapshot = (precheck.violations.length > 0
    ? precheck.violations
    : input.willViolations) as Prisma.InputJsonValue;

  // 4. Trade 수명주기 + Order 저장
  if (input.side === "BUY") {
    const trade = await applyBuy(user.id, input, fill, input.thesis ?? null, violationsSnapshot, ack.brokerOrderId);
    return NextResponse.json({ ok: true, side: "BUY", trade });
  }

  // SELL
  const open = await prisma.trade.findFirst({
    where: { userId: user.id, market: input.market, symbol: input.symbol, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  if (!open) {
    return NextResponse.json(
      { error: `보유 중인 ${input.symbol} 포지션이 없어 매도할 수 없습니다.` },
      { status: 422 },
    );
  }

  const entryPrice = Number(open.entryPrice ?? 0);
  const entryAt = open.entryAt ?? open.createdAt;
  const exitAt = new Date();
  const pnlPct = computePnlPct(entryPrice, fill.filledPrice);
  const holdDurationMin = computeHoldMin(entryAt, exitAt);

  const trade = await prisma.trade.update({
    where: { id: open.id },
    data: {
      status: "CLOSED",
      exitPrice: fill.filledPrice,
      exitQty: fill.filledQty,
      exitAt,
      pnlPct,
      holdDurationMin,
      orders: {
        create: {
          side: "SELL",
          orderType: input.orderType,
          price: input.price ?? null,
          quantity: fill.filledQty,
          stopPrice: input.stopPrice ?? null,
          forceReason: input.forceReason ?? null,
          willViolations: violationsSnapshot,
          brokerOrderId: ack.brokerOrderId,
          status: "FILLED",
          executedAt: exitAt,
        },
      },
    },
    include: { orders: true },
  });

  // 5. P3 보고서 트리거 (best-effort)
  await triggerReport(req.nextUrl.origin, trade.id);

  return NextResponse.json({ ok: true, side: "SELL", trade, pnlPct, holdDurationMin });
}

/** 매수 체결 적용: 기존 OPEN 거래에 평단 가산, 없으면 새 OPEN 거래 생성. */
async function applyBuy(
  userId: string,
  input: { market: "KR" | "US" | "COIN"; symbol: string; orderType: "LIMIT" | "MARKET"; price?: number; stopPrice?: number; forceReason?: string },
  fill: { filledPrice: number; filledQty: number },
  thesis: string | null,
  violationsSnapshot: Prisma.InputJsonValue,
  brokerOrderId: string,
) {
  const existing = await prisma.trade.findFirst({
    where: { userId, market: input.market, symbol: input.symbol, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  const orderCreate = {
    side: "BUY" as const,
    orderType: input.orderType,
    price: input.price ?? null,
    quantity: fill.filledQty,
    stopPrice: input.stopPrice ?? null,
    thesis,
    forceReason: input.forceReason ?? null,
    willViolations: violationsSnapshot,
    brokerOrderId,
    status: "FILLED" as const,
    executedAt: new Date(),
  };

  if (!existing) {
    return prisma.trade.create({
      data: {
        userId,
        market: input.market,
        symbol: input.symbol,
        status: "OPEN",
        entryPrice: fill.filledPrice,
        entryQty: fill.filledQty,
        entryAt: new Date(),
        orders: { create: orderCreate },
      },
      include: { orders: true },
    });
  }

  // 평단 가산
  const prevQty = Number(existing.entryQty ?? 0);
  const prevPrice = Number(existing.entryPrice ?? 0);
  const newQty = prevQty + fill.filledQty;
  const avgPrice = newQty > 0 ? (prevPrice * prevQty + fill.filledPrice * fill.filledQty) / newQty : fill.filledPrice;

  return prisma.trade.update({
    where: { id: existing.id },
    data: {
      entryPrice: avgPrice,
      entryQty: newQty,
      orders: { create: orderCreate },
    },
    include: { orders: true },
  });
}
