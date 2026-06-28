import type { RuleType } from "@prisma/client";
import type { TradeSummary } from "./report";

export const VALID_RULE_TYPES: RuleType[] = [
  "CHASE_SURGE",
  "PREMARKET_GAP",
  "NO_STOP_LOSS",
  "ALL_IN",
  "REVENGE_TRADE",
  "MARKET_ORDER_IMPULSE",
  "REPEATED_VIEWING",
];

// ────────────────────────────────────────────────────────────
// 보고서 생성 프롬프트
// 수정 포인트: 분석 톤, 조항 제안 기준, 원인 개수 등
// ────────────────────────────────────────────────────────────
export function buildReportPrompt(trade: TradeSummary): string {
  const kind = trade.pnlPct < 0 ? "DEATH" : "SURVIVAL";
  const buyOrder = trade.orders.find((o) => o.side === "BUY");
  const clauseList = trade.activeClauses
    .map((c) => `- [${c.id}] ${c.ruleType}: "${c.displayText}"`)
    .join("\n");

  return `당신은 투자 거래 복기 전문가입니다. 아래 거래 데이터를 분석해서 JSON을 반환하세요.

거래 정보:
- 종목: ${trade.symbol} (${trade.market})
- 손익률: ${trade.pnlPct > 0 ? "+" : ""}${trade.pnlPct.toFixed(2)}%
- 보유 시간: ${trade.holdDurationMin}분
- 주문 유형: ${buyOrder?.orderType ?? "MARKET"}
- 매수 이유: ${buyOrder?.thesis ?? "없음"}
- 손절가 설정: ${buyOrder?.stopPrice ? "있음" : "없음"}
- 강행 사유: ${buyOrder?.forceReason ?? "없음"}

현재 유언장 조항:
${clauseList || "없음"}

반환할 JSON 스키마:
{
  "kind": "${kind}",
  "body": "보고서 서술 본문 (2~3문장)",
  "causes": ["원인1", "원인2", "원인3"],
  "violatedClauses": ["clause_id_1"],
  "suggestions": [
    {
      "ruleType": "VALID_RULE_TYPE_ENUM",
      "suggestedParams": { "key": "value" },
      "displayText": "나는 ... 하지 않는다.",
      "rationale": "제안 근거"
    }
  ]
}

규칙:
- kind는 반드시 "${kind}"
- violatedClauses는 위반한 조항의 id만 (없으면 빈 배열)
- ruleType은 반드시 다음 중 하나: ${VALID_RULE_TYPES.join(", ")}
- displayText는 "나는 ...한다/않는다." 형식의 한국어
- JSON만 반환, 마크다운 코드블록 금지`;
}
