import { NextResponse } from "next/server";

/**
 * POST /api/order/precheck — 주문 게이팅 검사. [owner: P1 배선 · P4 검사 로직]
 *
 * 구현 가이드:
 *   1. body 파싱 → OrderDraft (zod 검증 권장)
 *   2. getBroker(creds).getQuote(market, symbol) → MarketData 구성   ← src/lib/broker
 *   3. prisma.clause.findMany({ where: { userId, active: true } })
 *   4. checkOrder(order, market, clauses)        ← src/lib/rules/engine.ts
 *   5. PrecheckResult 반환 (위반 있으면 낭독 모달 + 강행 사유 유도)
 */
export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1+P4", see: "src/lib/rules/engine.ts" },
    { status: 501 },
  );
}
