import type { ClauseRule, MarketData, OrderDraft, PrecheckResult, Violation } from "./types";

function chaseSurge(order: OrderDraft, market: MarketData, clause: ClauseRule): Violation | null {
  const pct = (clause.params.pct as number) ?? 10;
  if (order.side === "BUY" && market.changePct >= pct) {
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

function premarketGap(order: OrderDraft, market: MarketData, clause: ClauseRule): Violation | null {
  const pct = (clause.params.pct as number) ?? 3;
  // 프리마켓 시간대이거나, 당일 갭업(시가 > 전일종가 pct% 이상)
  if (order.side === "BUY" && (market.isPremarket || market.changePct >= pct)) {
    return {
      clauseId: clause.id,
      ruleType: clause.ruleType,
      message: `프리마켓/갭업 ${market.changePct.toFixed(1)}% — ${clause.displayText}`,
      severity: "block",
      actions: ["postpone", "switch_limit", "force"],
    };
  }
  return null;
}

function revengeTrade(order: OrderDraft, clause: ClauseRule): Violation | null {
  // 매수 이유(reason)에 "본전", "손실", "만회" 키워드가 있으면 감지
  // 실제 당일 손절 데이터는 브로커 연동 필요 — 현재는 이유 기반 감지
  const thesis = (order as unknown as { thesis?: string }).thesis ?? "";
  const keywords = ["본전", "만회", "복수", "다시", "손실", "손절 후"];
  const triggered = keywords.some((k) => thesis.includes(k));
  if (order.side === "BUY" && triggered) {
    return {
      clauseId: clause.id,
      ruleType: clause.ruleType,
      message: `보복 매매 의심 — ${clause.displayText}`,
      severity: "block",
      actions: ["postpone", "reduce_amount", "force"],
    };
  }
  return null;
}

function marketOrderImpulse(order: OrderDraft, market: MarketData, clause: ClauseRule): Violation | null {
  const surgePct = (clause.params.pct as number) ?? 5;
  if (order.side === "BUY" && order.orderType === "MARKET" && market.changePct >= surgePct) {
    return {
      clauseId: clause.id,
      ruleType: clause.ruleType,
      message: `과열 구간(${market.changePct.toFixed(1)}%)에서 시장가 주문 — ${clause.displayText}`,
      severity: "block",
      actions: ["switch_limit", "postpone", "force"],
    };
  }
  return null;
}

function averagingDown(order: OrderDraft, market: MarketData, clause: ClauseRule): Violation | null {
  const dropPct = (clause.params.pct as number) ?? -3;
  // 하락 중 추가 매수 감지 (changePct < dropPct)
  if (order.side === "BUY" && market.changePct <= dropPct) {
    return {
      clauseId: clause.id,
      ruleType: clause.ruleType,
      message: `하락 중(${market.changePct.toFixed(1)}%) 추가 매수 — ${clause.displayText}`,
      severity: "warn",
      actions: ["postpone", "reduce_amount", "force"],
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
      case "PREMARKET_GAP":
        v = premarketGap(order, market, clause);
        break;
      case "REVENGE_TRADE":
        v = revengeTrade(order, clause);
        break;
      case "MARKET_ORDER_IMPULSE":
        v = marketOrderImpulse(order, market, clause);
        break;
      case "AVERAGING_DOWN":
        v = averagingDown(order, market, clause);
        break;
      default:
        break;
    }
    if (v) violations.push(v);
  }

  return { ok: violations.length === 0, violations };
}
