import { NextResponse } from "next/server";

/**
 * POST /api/orders — 주문 실행. [owner: P1]
 *
 * 구현 가이드:
 *   1. body 파싱 → OrderDraft + overrideReason?(강행 시)
 *   2. precheck 재확인 (위반인데 overrideReason 없으면 422)
 *   3. getBroker().placeOrder(...)        ← src/lib/broker
 *   4. Order 저장 + Trade 생명주기 갱신(OPEN 생성 / 청산 시 CLOSED)
 *   5. 청산이면 보고서 트리거(POST /api/reports)
 */
export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", see: "src/lib/broker" },
    { status: 501 },
  );
}
