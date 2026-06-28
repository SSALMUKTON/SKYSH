import { NextResponse } from "next/server";

/**
 * POST /api/reports — 거래 종료 시 사망/생존 보고서 생성. [owner: P3]
 *
 * 구현 가이드:
 *   1. body 파싱 → { tradeId }
 *   2. prisma 로 Trade + orders 로드 → TradeSummary 구성
 *   3. generateTradeReport(summary)   ← src/lib/gemini/report.ts
 *   4. TradeReport 저장 + suggestedClauses 를 sourceTradeId 로 연결
 */
export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P3", see: "src/lib/gemini/report.ts" },
    { status: 501 },
  );
}
