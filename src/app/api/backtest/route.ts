import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");

  // ?period=목록 → 사용 가능한 기간 목록 반환
  if (period === "list") {
    try {
      const files = readdirSync(DATA_DIR)
        .filter((f) => f.startsWith("backtest_") && f.endsWith(".json"))
        .map((f) => f.replace("backtest_", "").replace(".json", ""));
      return NextResponse.json({ periods: files });
    } catch {
      return NextResponse.json({ periods: [] });
    }
  }

  const fileName = period ? `backtest_${period}.json` : "backtest_results.json";
  const filePath = join(DATA_DIR, fileName);

  try {
    const raw = readFileSync(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { error: `백테스트 결과가 없습니다. python -m pipelines.backtest ${period ? `--period "${period}"` : ""} 를 먼저 실행하세요.` },
      { status: 404 }
    );
  }
}
