import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Market } from "@prisma/client";
import { fundamentalsFile } from "./paths";

/**
 * 정형 재무(펀더멘털) JSON 읽기. [owner: P1]
 * US=SEC facts 파생 · KR=DART 파생. 두 자산군 동일 스키마(quarters[]).
 * ⚠️ 서버 전용.
 */

export interface FundamentalQuarter {
  period_end: string;
  form: string | null;
  revenue: number | null;
  gross_profit: number | null;
  operating_income: number | null;
  net_income: number | null;
  eps_diluted: number | null;
  operating_cash_flow: number | null;
  total_assets: number | null;
  total_equity: number | null;
  total_liabilities: number | null;
  cash: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  revenue_yoy: number | null;
  net_income_yoy: number | null;
  [k: string]: unknown;
}

export interface Fundamentals {
  ticker: string;
  currency: string | null;
  quarters: FundamentalQuarter[];
}

/**
 * 종목 펀더멘털. 파일 없으면 null. 최신 분기가 앞에 오도록 내림차순 정렬.
 * @param limit 최근 N개 분기만.
 */
export async function readFundamentals(
  market: Market,
  symbol: string,
  limit?: number,
): Promise<Fundamentals | null> {
  if (market === "COIN") return null; // 코인은 펀더멘털 없음
  const file = fundamentalsFile(market, symbol);
  if (!existsSync(file)) return null;

  const raw = JSON.parse(await readFile(file, "utf-8")) as Fundamentals;
  const quarters = (raw.quarters ?? [])
    .slice()
    .sort((a, b) => (b.period_end ?? "").localeCompare(a.period_end ?? ""));
  return {
    ticker: raw.ticker ?? symbol,
    currency: raw.currency ?? null,
    quarters: limit && limit > 0 ? quarters.slice(0, limit) : quarters,
  };
}
