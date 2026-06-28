import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Market, ReportKind, RuleType } from "@prisma/client";

/** Gemini 가 제안하는 새 조항. 자유텍스트 금지 — 룰 타입 + params 조정만 (spec.md). */
export interface SuggestedClause {
  ruleType: RuleType;
  suggestedParams: Record<string, unknown>;
  displayText: string;
  rationale: string;
}

export interface GeneratedReport {
  kind: ReportKind;
  body: string;
  causes: string[];
  violatedClauses: string[];
  suggestions: SuggestedClause[];
  rawAiResponse?: string;
}

/** 보고서 생성을 위한 거래 요약 입력. */
export interface TradeSummary {
  market: Market;
  symbol: string;
  pnlPct: number;
  holdDurationMin: number;
  orders: Array<{
    side: string;
    orderType: string;
    quantity: number;
    price?: number | null;
    stopPrice?: number | null;
    thesis?: string | null;
    forceReason?: string | null;
  }>;
  activeClauses: Array<{ id: string; ruleType: RuleType; displayText: string }>;
}

const VALID_RULE_TYPES: RuleType[] = [
  "CHASE_SURGE",
  "PREMARKET_GAP",
  "NO_STOP_LOSS",
  "ALL_IN",
  "REVENGE_TRADE",
  "MARKET_ORDER_IMPULSE",
  "REPEATED_VIEWING",
];

function buildPrompt(trade: TradeSummary): string {
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

function fallbackReport(trade: TradeSummary, raw?: string): GeneratedReport {
  const kind: ReportKind = trade.pnlPct < 0 ? "DEATH" : "SURVIVAL";
  return {
    kind,
    body:
      kind === "DEATH"
        ? `${trade.symbol} 거래에서 ${trade.pnlPct.toFixed(2)}% 손실이 발생했습니다.`
        : `${trade.symbol} 거래에서 ${trade.pnlPct.toFixed(2)}% 수익을 달성했습니다.`,
    causes: kind === "DEATH" ? ["거래 원인 분석 실패"] : ["수익 원인 분석 실패"],
    violatedClauses: [],
    suggestions: [],
    rawAiResponse: raw,
  };
}

function parseResponse(raw: string, trade: TradeSummary): GeneratedReport {
  // JSON 코드블록 제거
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  const kind: ReportKind = trade.pnlPct < 0 ? "DEATH" : "SURVIVAL";

  const suggestions: SuggestedClause[] = (parsed.suggestions ?? [])
    .filter((s: { ruleType: unknown }) => VALID_RULE_TYPES.includes(s.ruleType as RuleType))
    .map((s: SuggestedClause) => ({
      ruleType: s.ruleType,
      suggestedParams: s.suggestedParams ?? {},
      displayText: s.displayText ?? "",
      rationale: s.rationale ?? "",
    }));

  return {
    kind,
    body: parsed.body ?? "",
    causes: Array.isArray(parsed.causes) ? parsed.causes : [],
    violatedClauses: Array.isArray(parsed.violatedClauses) ? parsed.violatedClauses : [],
    suggestions,
    rawAiResponse: raw,
  };
}

export async function generateReport(trade: TradeSummary): Promise<GeneratedReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackReport(trade, "GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
  });

  let raw = "";
  try {
    const result = await model.generateContent(buildPrompt(trade));
    raw = result.response.text();
    return parseResponse(raw, trade);
  } catch {
    return fallbackReport(trade, raw || "Gemini call failed");
  }
}
