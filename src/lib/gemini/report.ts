import type { ReportKind } from "@prisma/client";

/** Gemini 가 제안하는 새 유언 조항. */
export interface SuggestedClause {
  ruleType: string; // RuleType 문자열 (예: "STOP_LOSS")
  params: Record<string, unknown>;
  displayText: string;
  rationale: string; // 이 조항을 제안하는 이유
}

export interface GeneratedReport {
  kind: ReportKind; // DEATH | SURVIVAL
  body: string; // 서술형 본문
  insights: Record<string, unknown>; // 구조화된 인사이트
  suggestedClauses: SuggestedClause[];
}

/** 보고서 생성을 위한 거래 요약 입력. P3 가 필요 시 확장. */
export interface TradeSummary {
  symbol: string;
  thesis?: string | null;
  entryAt?: Date | null;
  exitAt?: Date | null;
  pnlPct?: number; // 손익률(%). 양수=생존, 음수=사망
  orders: Array<{
    side: string;
    qty: number;
    price?: number | null;
    overrideReason?: string | null;
  }>;
}

/**
 * 거래 1건을 받아 Gemini 로 사망/생존 보고서를 생성한다. [owner: P3]
 *
 * TODO(P3): GEMINI_API_KEY 로 모델 호출(GEMINI_MODEL),
 *           body·insights·suggestedClauses 를 채워 반환.
 */
export async function generateTradeReport(
  trade: TradeSummary,
): Promise<GeneratedReport> {
  void trade;
  throw new Error("not implemented — P3 (generateTradeReport)");
}
