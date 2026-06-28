import { NextRequest, NextResponse } from "next/server";
import { getBroker, credsFromRequest } from "@/lib/broker";
import { isMarket } from "@/lib/trades";

/**
 * GET /api/market/quote?market=&symbol= — 현재가/등락률/거래량 조회. [owner: P1]
 *
 * 보안: 거래소/증권사 키는 서버에 저장하지 않는다. 실연동(KIS) 시 클라이언트가
 *   Authorization 헤더로 전달한 자격증명을 받아 중계한다.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const market = sp.get("market");
  const symbol = sp.get("symbol");

  if (!isMarket(market) || !symbol) {
    return NextResponse.json(
      { error: "market(KR|US|COIN) 와 symbol 쿼리가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const quote = await getBroker(credsFromRequest(req)).getQuote(market, symbol);
    return NextResponse.json(quote);
  } catch (e) {
    return NextResponse.json(
      { error: "시세 조회 실패", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
