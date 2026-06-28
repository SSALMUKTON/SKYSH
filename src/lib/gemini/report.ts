import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Market, ReportKind, RuleType } from "@prisma/client";
import { buildReportPrompt, VALID_RULE_TYPES } from "./prompts";

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
  displayName?: string;
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


function fallbackReport(trade: TradeSummary, raw?: string): GeneratedReport {
  const kind: ReportKind = trade.pnlPct < 0 ? "DEATH" : "SURVIVAL";
  const displayName = trade.displayName ?? trade.symbol;
  return {
    kind,
    body:
      kind === "DEATH"
        ? `${displayName} 거래에서 ${trade.pnlPct.toFixed(2)}% 손실이 발생했습니다.`
        : `${displayName} 거래에서 ${trade.pnlPct.toFixed(2)}% 수익을 달성했습니다.`,
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
    const result = await model.generateContent(buildReportPrompt(trade));
    raw = result.response.text();
    return parseResponse(raw, trade);
  } catch {
    return fallbackReport(trade, raw || "Gemini call failed");
  }
}
