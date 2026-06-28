import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Market } from "@prisma/client";
import { krDisclosuresFile, usNewsDir } from "./paths";

/**
 * 종목 관련 뉴스/공시 피드. [owner: P1]
 *
 *  - US : Alpaca 뉴스(날짜별 파일)를 최근부터 스캔해 해당 티커 언급분만 추림.
 *  - KR : 국내 뉴스 소스 미정(CLAUDE.md) → DART 공시를 피드로 사용.
 *  - COIN: 소스 없음 → 빈 배열.
 * ⚠️ 서버 전용.
 */

export interface FeedItem {
  kind: "news" | "disclosure";
  title: string;
  summary?: string;
  url: string;
  date: string; // YYYY-MM-DD
  source: string;
}

const US_SCAN_FILES = 180; // 최근 N개 날짜파일까지만 스캔
const DEFAULT_LIMIT = 30;

interface RawNews {
  headline: string;
  summary?: string;
  symbols?: string[];
  source?: string;
  url: string;
  created_at: string;
}

async function readUsNews(symbol: string, limit: number): Promise<FeedItem[]> {
  const dir = usNewsDir();
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a)) // 최신 날짜 우선
    .slice(0, US_SCAN_FILES);

  const out: FeedItem[] = [];
  const sym = symbol.toUpperCase();
  for (const f of files) {
    if (out.length >= limit) break;
    let arr: RawNews[];
    try {
      arr = JSON.parse(await readFile(`${dir}/${f}`, "utf-8"));
    } catch {
      continue;
    }
    for (const n of arr) {
      if (!n.symbols?.some((s) => s.toUpperCase() === sym)) continue;
      out.push({
        kind: "news",
        title: n.headline,
        summary: n.summary || undefined,
        url: n.url,
        date: (n.created_at ?? f.slice(0, 10)).slice(0, 10),
        source: n.source || "Benzinga",
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

interface RawDisclosure {
  report_nm: string;
  rcept_dt: string; // YYYYMMDD
  flr_nm?: string;
  corp_name?: string;
  url: string;
}

async function readKrDisclosures(symbol: string, limit: number): Promise<FeedItem[]> {
  const file = krDisclosuresFile(symbol);
  if (!existsSync(file)) return [];
  let arr: RawDisclosure[];
  try {
    arr = JSON.parse(await readFile(file, "utf-8"));
  } catch {
    return [];
  }
  return arr.slice(0, limit).map((d) => ({
    kind: "disclosure" as const,
    title: d.report_nm.trim(),
    url: d.url,
    date: /^\d{8}$/.test(d.rcept_dt)
      ? `${d.rcept_dt.slice(0, 4)}-${d.rcept_dt.slice(4, 6)}-${d.rcept_dt.slice(6, 8)}`
      : d.rcept_dt,
    source: (d.flr_nm || d.corp_name || "DART").trim(),
  }));
}

export async function readFeed(
  market: Market,
  symbol: string,
  limit = DEFAULT_LIMIT,
): Promise<FeedItem[]> {
  if (market === "US") return readUsNews(symbol, limit);
  if (market === "KR") return readKrDisclosures(symbol, limit);
  return []; // COIN
}
