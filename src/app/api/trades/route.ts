import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listUniverse } from "@/lib/data/universe";
import { getDemoUser } from "@/lib/user";
import { computeHoldMin, computePnlPct, isMarket, triggerReport } from "@/lib/trades";

/**
 * /api/trades — 거래(매수~매도 묶음) 조회/생성/삭제. [owner: P1]
 *
 *   GET    : 사용자 Trade 목록 (status·market 필터). orders/report 포함.
 *   POST   : 과거 거래 수동 입력 — 진입(+선택적 청산)까지. 테스트/보고서용.
 *   DELETE : ?id= 로 거래 삭제 (테스트 정리용).
 *
 * 실시간 주문 경로의 Trade 생성은 /api/order/execute 가 담당한다.
 */
export async function GET(req: NextRequest) {
  const user = await getDemoUser();
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const market = sp.get("market");

  const where: Prisma.TradeWhereInput = { userId: user.id };
  if (status === "OPEN" || status === "CLOSED") where.status = status;
  if (isMarket(market)) where.market = market;

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { orders: { orderBy: { createdAt: "asc" } }, report: true },
  });
  const universes = await Promise.all(["KR", "US", "COIN"].map((m) => listUniverse(m as "KR" | "US" | "COIN")));
  const namesByMarket = new Map(
    ["KR", "US", "COIN"].map((m, i) => [m, new Map(universes[i].map((it) => [it.symbol, it.name]))]),
  );
  const withDisplayNames = trades.map((trade) => {
    const company = namesByMarket.get(trade.market)?.get(trade.symbol);
    return company && company !== trade.symbol ? { ...trade, company } : trade;
  });
  return NextResponse.json({ trades: withDisplayNames });
}

const manualTradeSchema = z
  .object({
    market: z.enum(["KR", "US", "COIN"]),
    symbol: z.string().min(1),
    entryPrice: z.number().positive(),
    entryQty: z.number().positive(),
    entryAt: z.string().min(1), // ISO
    orderType: z.enum(["LIMIT", "MARKET"]).default("MARKET"),
    stopPrice: z.number().positive().optional(),
    thesis: z.string().optional(),
    // 청산(선택) — 셋이 모두 있으면 CLOSED 로 생성
    exitPrice: z.number().positive().optional(),
    exitQty: z.number().positive().optional(),
    exitAt: z.string().optional(),
  })
  .refine(
    (d) => {
      const anyExit = d.exitPrice != null || d.exitQty != null || (d.exitAt && d.exitAt.length > 0);
      const allExit = d.exitPrice != null && d.exitQty != null && !!d.exitAt;
      return !anyExit || allExit;
    },
    { message: "청산을 입력하려면 exitPrice·exitQty·exitAt 를 모두 채워야 합니다." },
  );

export async function POST(req: NextRequest) {
  const parsed = manualTradeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 거래 형식", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const user = await getDemoUser();

  const entryAt = new Date(d.entryAt);
  if (Number.isNaN(entryAt.getTime())) {
    return NextResponse.json({ error: "entryAt 날짜 형식 오류" }, { status: 400 });
  }
  const closed = d.exitPrice != null && d.exitQty != null && !!d.exitAt;
  const exitAt = closed ? new Date(d.exitAt as string) : null;
  if (closed && Number.isNaN(exitAt!.getTime())) {
    return NextResponse.json({ error: "exitAt 날짜 형식 오류" }, { status: 400 });
  }

  const orders: Prisma.OrderCreateWithoutTradeInput[] = [
    {
      side: "BUY",
      orderType: d.orderType,
      price: d.orderType === "LIMIT" ? d.entryPrice : null,
      quantity: d.entryQty,
      stopPrice: d.stopPrice ?? null,
      thesis: d.thesis ?? null,
      status: "FILLED",
      executedAt: entryAt,
      brokerOrderId: `manual-BUY-${d.symbol}`,
    },
  ];
  if (closed) {
    orders.push({
      side: "SELL",
      orderType: d.orderType,
      price: d.orderType === "LIMIT" ? d.exitPrice! : null,
      quantity: d.exitQty!,
      status: "FILLED",
      executedAt: exitAt!,
      brokerOrderId: `manual-SELL-${d.symbol}`,
    });
  }

  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      market: d.market,
      symbol: d.symbol,
      status: closed ? "CLOSED" : "OPEN",
      entryPrice: d.entryPrice,
      entryQty: d.entryQty,
      entryAt,
      exitPrice: closed ? d.exitPrice! : null,
      exitQty: closed ? d.exitQty! : null,
      exitAt,
      pnlPct: closed ? computePnlPct(d.entryPrice, d.exitPrice!) : null,
      holdDurationMin: closed ? computeHoldMin(entryAt, exitAt!) : null,
      orders: { create: orders },
    },
    include: { orders: true },
  });

  // 청산된 과거 거래면 보고서 트리거(테스트/리포트 작성용)
  if (closed) await triggerReport(req.nextUrl.origin, trade.id);

  return NextResponse.json({ ok: true, trade }, { status: 201 });
}

const closeTradeSchema = z.object({
  exitPrice: z.number().positive(),
  exitQty: z.number().positive(),
  exitAt: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const parsed = closeTradeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 형식", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const user = await getDemoUser();
  const trade = await prisma.trade.findFirst({
    where: { id, userId: user.id, status: "OPEN" },
    include: { orders: true },
  });
  if (!trade) return NextResponse.json({ error: "거래 없음 또는 이미 청산됨" }, { status: 404 });

  const d = parsed.data;
  const exitAt = new Date(d.exitAt);
  if (Number.isNaN(exitAt.getTime())) {
    return NextResponse.json({ error: "exitAt 날짜 형식 오류" }, { status: 400 });
  }

  if (!trade.entryAt) {
    return NextResponse.json({ error: "거래 진입 시각 없음" }, { status: 400 });
  }
  const pnlPct = computePnlPct(Number(trade.entryPrice), d.exitPrice);
  const holdDurationMin = computeHoldMin(trade.entryAt, exitAt);

  const updated = await prisma.trade.update({
    where: { id },
    data: {
      status: "CLOSED",
      exitPrice: d.exitPrice,
      exitQty: d.exitQty,
      exitAt,
      pnlPct,
      holdDurationMin,
      orders: {
        create: {
          side: "SELL",
          orderType: "MARKET",
          price: null,
          quantity: d.exitQty,
          status: "FILLED",
          executedAt: exitAt,
          brokerOrderId: `manual-SELL-${trade.symbol}`,
        },
      },
    },
    include: { orders: true },
  });

  await triggerReport(req.nextUrl.origin, updated.id);

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const user = await getDemoUser();
  const trade = await prisma.trade.findFirst({ where: { id, userId: user.id } });
  if (!trade) return NextResponse.json({ error: "거래 없음" }, { status: 404 });
  await prisma.trade.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
