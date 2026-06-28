import type { RuleType } from "@prisma/client";
import type { TradeSummary } from "./report";

// 백테스트 지원 룰만 (일봉 데이터로 감지 불가한 ALL_IN 등 제외)
export const VALID_RULE_TYPES: RuleType[] = [
  "CHASE_SURGE",
  "NO_STOP_LOSS",
  "REVENGE_TRADE",
  "MARKET_ORDER_IMPULSE",
  "PREMARKET_GAP",
  "AVERAGING_DOWN",
];

// ────────────────────────────────────────────────────────────
// 자연어 → 조항 변환 프롬프트
// 수정 포인트: 변환 톤, 조항 형식, ruleType 매핑 기준
// ────────────────────────────────────────────────────────────
export function buildConvertPrompt(text: string): string {
  return `투자 원칙을 정형화된 유언장 조항으로 변환하세요.

사용자 입력: "${text}"

먼저 입력이 투자·매매·자산 관련 원칙인지 판단하세요.
투자와 무관한 내용(인사말, 일상 대화, 무의미한 문자 등)이면 반드시 아래 형식으로만 반환:
{"error": "투자 원칙과 관련 없는 내용입니다."}

투자 관련 내용이면 아래 JSON 반환:
{
  "ruleType": "RULE_TYPE_ENUM",
  "displayText": "나는 ... 하지 않는다. / 나는 반드시 ... 한다.",
  "params": {}
}

ruleType은 반드시 다음 중 하나 (각 패턴 설명 참고):
- CHASE_SURGE: 급등 종목을 뒤늦게 시장가로 추격 매수하는 습관
- NO_STOP_LOSS: 손절 기준 없이 진입하거나 손절을 계속 미루는 습관
- REVENGE_TRADE: 손실 후 본전 심리로 같은 날 재진입하는 보복 매매
- MARKET_ORDER_IMPULSE: 과열 구간에서 충동적으로 시장가 주문을 내는 습관
- PREMARKET_GAP: 프리마켓 갭업 종목을 정규장 시작 직후 추격 매수하는 습관
- AVERAGING_DOWN: 하락 중인 종목에 추가 매수(물타기)하는 습관

규칙:
- displayText는 반드시 "나는"으로 시작하는 한국어 한 문장
- 입력 내용이 위 패턴 중 어디에 해당하는지 먼저 판단하고, 그 패턴에 맞는 구체적인 조항 문장 작성
- 딱 맞는 패턴이 없으면 NO_STOP_LOSS
- displayText에 구체적인 수치나 조건이 있으면 포함 (예: "3일 연속 하락 시", "+10% 이상 급등 후")
- params는 수치가 있으면 채우고 없으면 빈 객체
- JSON만 반환, 설명 금지, 마크다운 코드블록 금지`;
}

// ────────────────────────────────────────────────────────────
// 보고서 생성 프롬프트
// 수정 포인트: 분석 톤, 조항 제안 기준, 원인 개수 등
// ────────────────────────────────────────────────────────────
export function buildReportPrompt(trade: TradeSummary): string {
  const kind = trade.pnlPct < 0 ? "DEATH" : "SURVIVAL";
  const buyOrder = trade.orders.find((o) => o.side === "BUY");
  const displayName = trade.displayName ?? trade.symbol;
  const symbolInfo = displayName === trade.symbol
    ? `${trade.symbol} (${trade.market})`
    : `${displayName} (${trade.symbol}, ${trade.market})`;
  const clauseList = trade.activeClauses
    .map((c) => `- [${c.id}] ${c.ruleType}: "${c.displayText}"`)
    .join("\n");

  return `당신은 투자 거래 복기 전문가입니다. 아래 거래 데이터를 분석해서 JSON을 반환하세요.

거래 정보:
- 종목: ${symbolInfo}
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
