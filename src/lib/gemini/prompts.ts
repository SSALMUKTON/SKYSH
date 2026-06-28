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
  return `사용자 입력을 투자 원칙으로 정형화하세요. 입력 형식은 자유롭습니다.

사용자 입력: "${text}"

먼저 입력이 주식 매매·투자 습관과 관련 있는지 판단하세요.
주식/투자와 무관한 내용(일상 대화, 인사말 등)이면 반드시 아래 형식으로만 반환:
{"error": "투자 원칙과 관련 없는 내용입니다."}

주식 매매 관련 내용이면 아래 JSON 반환:
{
  "ruleType": "RULE_TYPE_ENUM",
  "displayText": "나는 ... 하지 않는다. / 나는 반드시 ... 한다.",
  "params": {}
}

ruleType: 입력 내용의 투자 습관을 분석해서 가장 가까운 패턴 선택
  * 사용 가능한 패턴:
    - CHASE_SURGE: 급등 직후 시장가로 추격 매수
    - NO_STOP_LOSS: 손절 없이 진입 (디폴트 — 정확히 맞는 게 없으면 이것 사용)
    - REVENGE_TRADE: 손실 후 같은 날 재진입
    - MARKET_ORDER_IMPULSE: 과열 구간에서 충동적 시장가 주문
    - PREMARKET_GAP: 프리마켓 갭업 후 추격 매수
    - AVERAGING_DOWN: 하락 중 추가 매수
  * 입력이 이 중 어디에도 정확히 맞지 않으면 → NO_STOP_LOSS 사용
  * displayText는 입력의 의미를 보존하면서도 백테스트 가능한 형태로 정형화

규칙:
- displayText: 자유로운 입력을 백테스트 가능한 표준 형태로 변환
  * "나는 [조건] [행동하지 않는다/한다]" 형식
  * 구체적 수치/조건 포함 (예: "3일 하락 시", "+10% 급등 후")
  * 항상 현재형·의도 기반 (과거형 입력도 현재형 원칙으로)
  * 예시:
    - 입력 "아침에 갭상 보고 FOMO 와서 사버림" → "나는 프리마켓 갭업 직후 바로 매수하지 않는다"
    - 입력 "떨어지니까 더 살 때가 있어" → "나는 3일 연속 하락 시 추가 매수하지 않는다"
- ruleType: 패턴이 명확하지 않으면 NO_STOP_LOSS
- params: 수치 있으면 포함, 없으면 {}
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
