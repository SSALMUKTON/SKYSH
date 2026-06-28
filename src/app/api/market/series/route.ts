import { NextRequest, NextResponse } from "next/server";
import { readPriceSeries } from "@/lib/data";
import { isMarket } from "@/lib/trades";

/**
 * GET /api/market/series?market=&symbol=&limit= — 일봉 시계열(차트용). [owner: P1]
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const market = sp.get("market");
  const symbol = sp.get("symbol");
  if (!isMarket(market) || !symbol) {
    return NextResponse.json({ error: "market 와 symbol 필요" }, { status: 400 });
  }

  const limit = Math.min(Number(sp.get("limit")) || 120, 2000);
  const candles = await readPriceSeries(market, symbol, limit);
  if (!candles) {
    return NextResponse.json({ error: "가격 데이터 없음" }, { status: 404 });
  }
  return NextResponse.json({ market, symbol, candles });
}
