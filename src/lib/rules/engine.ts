import type {
  ClauseRule,
  EvalContext,
  OrderDraft,
  PrecheckResult,
} from "./types";

/**
 * 주문을 활성 유언 조항들과 대조해 위반 여부를 판정한다. [owner: P4]
 * MVP 는 RuleType 중 2개부터 구현(예: STOP_LOSS, NO_AVERAGING_DOWN).
 *
 * @param order   precheck 대상 주문
 * @param clauses 사용자의 ACTIVE 유언 조항들
 * @param context 평가에 필요한 외부 상태(현재가·보유수량 등)
 * @returns       위반 목록을 담은 PrecheckResult
 *
 * TODO(P4): ruleType 별 검사 로직 구현. 지금은 모든 주문을 통과시키는 스텁.
 */
export function evaluateOrder(
  order: OrderDraft,
  clauses: ClauseRule[],
  context: EvalContext = {},
): PrecheckResult {
  void order;
  void clauses;
  void context;
  return { ok: true, violations: [] };
}
