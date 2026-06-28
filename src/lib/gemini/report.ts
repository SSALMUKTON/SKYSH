import type { Market, ReportKind, RuleType } from "@prisma/client";

/** Gemini 가 제안하는 새 조항. 자유텍스트 금지 — 룰 타입 + params 조정만 (spec.md). */
export interface SuggestedClause {
  ruleType: RuleType;
  suggestedParams: Record<string, unknown>;
  displayText: string; // 제안 문구
  rationale: string; // 제안 근거
}

export interface GeneratedReport {
  kind: ReportKind; // DEATH | SURVIVAL
  body: string; // 렌더용 서술 본문
  causes: string[]; // 주요 사망/생존 원인
  violatedClauses: string[]; // 위반(또는 지킨) 조항 id
  suggestions: SuggestedClause[];
  rawAiResponse?: string; // 파싱 실패 대비 원본 보관
}

/** 보고서 생성을 위한 거래 요약 입력. P3 가 필요 시 확장. */
export interface TradeSummary {
  market: Market;
  symbol: string;
  pnlPct: number; // 손익률(%). 양수=생존, 음수=사망
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

/**
 * 거래 1건을 받아 Gemini 로 사망진단서/생존보고서를 생성한다. [owner: P3]
 *
 * 구현 가이드(P3):
 *   - pnlPct 부호로 DEATH/SURVIVAL 분기.
 *   - GEMINI_API_KEY(GEMINI_MODEL)로 호출 → JSON 구조화 출력 강제 → 파싱.
 *   - 파싱 실패 시 rawAiResponse 보관 + fallback.
 *   - suggestions 는 기존 ruleType + params 조정만 (자유텍스트 금지).
 */
export async function generateReport(
  trade: TradeSummary,
): Promise<GeneratedReport> {
  void trade;
  throw new Error("not implemented — P3 (generateReport)");
}
