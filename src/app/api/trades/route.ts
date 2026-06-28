import { NextResponse } from "next/server";

/**
 * /api/trades — 거래(매수~매도 묶음) 조회/생성. [owner: P1]
 *
 *   GET  : 사용자의 Trade 목록 (status 필터 지원 권장)
 *   POST : 신규 Trade(OPEN) 생성 — symbol, thesis, entryAt
 *
 * 구현 가이드: prisma.trade.* + orders/report include.
 */
export async function GET() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", todo: "Trade 목록 조회" },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", todo: "Trade(OPEN) 생성" },
    { status: 501 },
  );
}
