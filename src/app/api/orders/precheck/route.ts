import { NextResponse } from "next/server";

/**
 * POST /api/orders/precheck — 주문 게이팅 검사. [owner: P1 배선 · P4 검사 로직]
 *
 * 구현 가이드:
 *   1. body 파싱 → OrderDraft (zod 검증 권장)
 *   2. prisma.willClause.findMany({ where: { userId, status: "ACTIVE" } })
 *   3. evaluateOrder(order, clauses, context)  ← src/lib/rules/engine.ts
 *   4. PrecheckResult 반환 (위반 있으면 강행 사유 입력 유도)
 */
export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1+P4", see: "src/lib/rules/engine.ts" },
    { status: 501 },
  );
}
