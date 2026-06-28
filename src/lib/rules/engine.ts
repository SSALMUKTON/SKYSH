import type { ClauseRule, MarketData, OrderDraft, PrecheckResult, Violation } from "./types";

function chaseSurge(
  order: OrderDraft,
  market: MarketData,
  clause: ClauseRule,
): Violation | null {
  const pct = (clause.params.pct as number) ?? 15;
  if (order.side === "BUY" && order.orderType === "MARKET" && market.changePct >= pct) {
    return {
      clauseId: clause.id,
      ruleType: clause.ruleType,
      message: `현재 ${market.changePct.toFixed(1)}% 급등 중 — ${clause.displayText}`,
      severity: "block",
      actions: ["switch_limit", "reduce_amount", "postpone", "force"],
    };
  }
  return null;
}

function noStopLoss(order: OrderDraft, clause: ClauseRule): Violation | null {
  if (order.side === "BUY" && !order.stopPrice) {
    return {
      clauseId: clause.id,
      ruleType: clause.ruleType,
      message: `손절 기준 미입력 — ${clause.displayText}`,
      severity: "warn",
      actions: ["set_stop_loss", "force"],
    };
  }
  return null;
}

export function checkOrder(
  order: OrderDraft,
  market: MarketData,
  clauses: ClauseRule[],
): PrecheckResult {
  const violations: Violation[] = [];

  for (const clause of clauses) {
    let v: Violation | null = null;
    switch (clause.ruleType) {
      case "CHASE_SURGE":
        v = chaseSurge(order, market, clause);
        break;
      case "NO_STOP_LOSS":
        v = noStopLoss(order, clause);
        break;
      default:
        break;
    }
    if (v) violations.push(v);
  }

  return { ok: violations.length === 0, violations };
}
