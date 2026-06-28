import { NextRequest, NextResponse } from "next/server";
import { readFundamentals } from "@/lib/data";
import { isMarket } from "@/lib/trades";

/**
 * GET /api/market/fundamentals?market=&symbol=&limit= — 정형 재무(분기). [owner: P1]
 * US=SEC · KR=DART 파생. 코인은 없음(null).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const market = sp.get("market");
  const symbol = sp.get("symbol");
  if (!isMarket(market) || !symbol) {
    return NextResponse.json({ error: "market 와 symbol 필요" }, { status: 400 });
  }

  const limit = Math.min(Number(sp.get("limit")) || 8, 40);
  const data = await readFundamentals(market, symbol, limit);
  if (!data) {
    return NextResponse.json({ error: "펀더멘털 없음", market, symbol }, { status: 404 });
  }
  return NextResponse.json(data);
}
