import { NextResponse } from "next/server";
import { listData, readDataText } from "@/lib/data/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");

  // ?period=목록 → 사용 가능한 기간 목록 반환 (data/ 루트의 backtest_*.json)
  if (period === "list") {
    const files = (await listData(""))
      .filter((f) => f.startsWith("backtest_") && f.endsWith(".json"))
      .map((f) => f.replace("backtest_", "").replace(".json", ""));
    return NextResponse.json({ periods: files });
  }

  const fileName = period ? `backtest_${period}.json` : "backtest_results.json";
  const raw = await readDataText(fileName);

  if (raw === null) {
    return NextResponse.json(
      { error: `백테스트 결과가 없습니다. python -m pipelines.backtest ${period ? `--period "${period}"` : ""} 를 먼저 실행하세요.` },
      { status: 404 },
    );
  }
  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "백테스트 결과 파싱 실패" }, { status: 500 });
  }
}
