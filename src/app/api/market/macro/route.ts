import { NextRequest, NextResponse } from "next/server";
import { readMacro, MACRO_SOURCE } from "@/lib/data";
import { isMarket } from "@/lib/trades";

/**
 * GET /api/market/macro?market= — 시장별 거시경제 지표. [owner: P2]
 * 종목 무관(시장 전체). US=FRED · KR=ECOS · COIN=글로벌 위험자산 환경.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const market = sp.get("market");
  if (!isMarket(market)) {
    return NextResponse.json({ error: "market 필요" }, { status: 400 });
  }
  const indicators = await readMacro(market);
  return NextResponse.json({ market, source: MACRO_SOURCE[market], indicators });
}
