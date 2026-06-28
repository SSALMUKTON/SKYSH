import { NextResponse } from "next/server";

/**
 * /api/trades — 거래(매수~매도 묶음) 조회/생성. [owner: P1]
 *
 *   GET  : 사용자의 Trade 목록 (status·market 필터 권장)
 *   POST : 신규 Trade(OPEN) 생성 — market, symbol, entry 정보
 *
 * 구현 가이드: prisma.trade.* + orders/report include. 대부분의 Trade 생성은
 *   /api/order/execute 흐름에서 일어난다.
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
