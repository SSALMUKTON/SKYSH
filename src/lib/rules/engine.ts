import type {
  ClauseRule,
  MarketData,
  OrderDraft,
  PrecheckResult,
} from "./types";

/**
 * 주문을 활성 유언 조항들과 대조해 위반 여부를 판정한다. [owner: P4]
 * spec.md 의 checkOrder(order, market, clauses) 에 해당.
 * MVP 는 룰 2개부터: CHASE_SURGE(급등 추격), NO_STOP_LOSS(손절 없음).
 *
 * @param order   precheck 대상 주문
 * @param market  현재 시장 데이터(현재가·등락률 등)
 * @param clauses 사용자의 활성(active) 유언 조항들
 * @returns       위반 목록을 담은 PrecheckResult
 *
 * 구현 가이드(P4):
 *   - ruleType 별 함수로 분기 (chaseSurge, noStopLoss, ...).
 *   - CHASE_SURGE: market.changePct >= params.pct 이고 시장가 매수면 위반.
 *   - NO_STOP_LOSS: side=BUY 인데 order.stopPrice 미입력이면 위반.
 *   지금은 모든 주문을 통과시키는 스텁.
 */
export function checkOrder(
  order: OrderDraft,
  market: MarketData,
  clauses: ClauseRule[],
): PrecheckResult {
  void order;
  void market;
  void clauses;
  return { ok: true, violations: [] };
}
