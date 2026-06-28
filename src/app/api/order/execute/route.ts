import { NextResponse } from "next/server";

/**
 * POST /api/order/execute — 주문 실행. [owner: P1]
 *
 * 구현 가이드:
 *   1. body 파싱 → OrderDraft + forceReason?(강행 시) + willViolations
 *   2. precheck 재확인 (위반인데 forceReason 없으면 422)
 *   3. getBroker(creds).placeOrder(...) → getFill(...)      ← src/lib/broker
 *   4. Order 저장(status·brokerOrderId) + Trade 생명주기:
 *        매수 체결 → Trade(OPEN) 생성/갱신, 매도 체결 → CLOSED + pnlPct·holdDurationMin 계산
 *   5. 청산이면 보고서 트리거(POST /api/reports)
 */
export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", see: "src/lib/broker" },
    { status: 501 },
  );
}
