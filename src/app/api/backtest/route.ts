import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// GET /api/backtest — 백테스트 결과 반환
export async function GET() {
  try {
    const path = join(process.cwd(), "data", "backtest_results.json");
    const raw = readFileSync(path, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "백테스트 결과가 없습니다. python -m pipelines.backtest 를 먼저 실행하세요." }, { status: 404 });
  }
}
