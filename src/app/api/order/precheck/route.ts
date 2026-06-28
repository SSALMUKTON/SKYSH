import { NextRequest, NextResponse } from "next/server";
import { getBroker, credsFromRequest } from "@/lib/broker";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/user";
import { orderDraftSchema } from "@/lib/order-schema";
import { checkOrder } from "@/lib/rules/engine";
import type { ClauseRule, MarketData, OrderDraft } from "@/lib/rules/types";

/**
 * POST /api/order/precheck — 주문 게이팅 검사. [owner: P1 배선 · P4 검사 로직]
 *
 *   1. body → OrderDraft (zod)
 *   2. 브로커 시세 fetch → MarketData
 *   3. 활성 유언 조항 로드
 *   4. checkOrder(order, market, clauses)  ← P4 규칙엔진
 *   5. PrecheckResult 반환(위반 있으면 프론트가 낭독 모달)
 */
export async function POST(req: NextRequest) {
  const parsed = orderDraftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 주문 형식", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const draft = parsed.data;

  // 2. 시세
  const quote = await getBroker(credsFromRequest(req)).getQuote(draft.market, draft.symbol);
  const market: MarketData = {
    price: quote.price,
    prevClose: quote.prevClose,
    changePct: quote.changePct,
    volume: quote.volume,
    isPremarket: quote.isPremarket,
  };

  // 3. 활성 조항
  const user = await getDemoUser();
  const clauseRows = await prisma.clause.findMany({
    where: { userId: user.id, active: true },
  });
  const clauses: ClauseRule[] = clauseRows.map((c) => ({
    id: c.id,
    ruleType: c.ruleType,
    params: (c.params ?? {}) as Record<string, unknown>,
    displayText: c.displayText,
  }));

  // 4. 검사 (P4)
  const order: OrderDraft = {
    market: draft.market,
    symbol: draft.symbol,
    side: draft.side,
    orderType: draft.orderType,
    quantity: draft.quantity,
    price: draft.price,
    stopPrice: draft.stopPrice,
  };
  const result = checkOrder(order, market, clauses);

  return NextResponse.json({ ...result, quote });
}
