import { NextResponse } from "next/server";

/**
 * POST /api/reports — 거래 종료 시 사망진단서/생존보고서 생성. [owner: P3]
 *
 * 구현 가이드:
 *   1. body 파싱 → { tradeId }
 *   2. prisma 로 Trade + orders + activeClauses 로드 → TradeSummary 구성
 *   3. generateReport(summary)        ← src/lib/gemini/report.ts
 *   4. Report 저장 + suggestions(ClauseSuggestion) 저장(상태 PENDING)
 *
 *   GET /api/reports : 사용자의 보고서 목록 조회
 */
export async function GET() {
  return NextResponse.json(
    { error: "not implemented", owner: "P3", todo: "Report 목록 조회" },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P3", see: "src/lib/gemini/report.ts" },
    { status: 501 },
  );
}
