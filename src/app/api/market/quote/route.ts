import { NextResponse } from "next/server";

/**
 * GET /api/market/quote?market=&symbol= — 현재가/등락률/거래량 조회. [owner: P1]
 *
 * 보안: 거래소/증권사 키는 서버에 저장하지 않는다. 실연동 시 클라이언트가
 *       Authorization 헤더로 전달한 자격증명을 받아 getBroker(creds).getQuote 로 중계.
 *
 * 구현 가이드: getBroker(creds).getQuote(market, symbol) 반환.   ← src/lib/broker
 */
export async function GET() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", see: "src/lib/broker" },
    { status: 501 },
  );
}
