import { NextRequest, NextResponse } from "next/server";
import { readFeed } from "@/lib/data";
import { isMarket } from "@/lib/trades";

/**
 * GET /api/market/news?market=&symbol=&limit= — 종목 뉴스/공시 피드. [owner: P1]
 * US=Alpaca 뉴스 · KR=DART 공시 · COIN=소스 없음(빈 배열).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const market = sp.get("market");
  const symbol = sp.get("symbol");
  if (!isMarket(market) || !symbol) {
    return NextResponse.json({ error: "market 와 symbol 필요" }, { status: 400 });
  }

  const limit = Math.min(Number(sp.get("limit")) || 30, 100);
  const items = await readFeed(market, symbol, limit);
  return NextResponse.json({ market, symbol, items });
}
