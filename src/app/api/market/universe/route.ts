import { NextRequest, NextResponse } from "next/server";
import { listUniverse } from "@/lib/data";
import { isMarket } from "@/lib/trades";

/**
 * GET /api/market/universe?market=&q=&limit= — 자산군별 종목 목록. [owner: P1]
 * 가격 데이터가 있는 종목만 반환(전부 차트/시세 조회 가능). q 로 코드/이름 검색.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const market = sp.get("market");
  if (!isMarket(market)) {
    return NextResponse.json({ error: "market(KR|US|COIN) 필요" }, { status: 400 });
  }

  const q = sp.get("q")?.trim().toLowerCase();
  const limit = Math.min(Number(sp.get("limit")) || 100, 1000);

  let items = await listUniverse(market);
  if (q) {
    items = items.filter(
      (it) => it.symbol.toLowerCase().includes(q) || it.name.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ market, total: items.length, items: items.slice(0, limit) });
}
