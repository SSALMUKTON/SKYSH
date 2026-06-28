import type { Market } from "@prisma/client";
import { krDartCorpcodesFile, pricesDir, universeFile } from "./paths";
import { listData, readDataJson } from "./storage";

/**
 * 자산군별 종목 목록(유니버스). [owner: P1]
 *
 * "가격 parquet 이 존재하는 종목"을 기준으로 잡아 목록의 모든 종목이 차트/시세
 * 조회 가능하도록 보장하고, 이름은 자산군별 유니버스 소스에서 붙인다.
 * ⚠️ 서버 전용.
 */

export interface UniverseItem {
  symbol: string; // KR: 종목코드 · US: 티커 · COIN: 마켓(KRW-BTC)
  name: string; // 표시 이름 (없으면 symbol)
}

const cache = new Map<Market, UniverseItem[]>();

/** 자산군별 이름 매핑(symbol → name) 로드. */
async function loadNames(market: Market): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const raw = await readDataJson<unknown>(universeFile(market));
  if (raw === null) return names;

  if (market === "KR") {
    // [{ code, name }]
    for (const it of raw as { code: string; name: string }[]) {
      names.set(it.code, it.name);
    }
    const dartRaw = await readDataJson<Record<string, { corp_name?: string }>>(
      krDartCorpcodesFile(),
    );
    if (dartRaw) {
      for (const [code, item] of Object.entries(dartRaw)) {
        if (item.corp_name) names.set(code, item.corp_name);
      }
    }
  } else if (market === "COIN") {
    // [{ market, korean_name, english_name }]
    for (const it of raw as { market: string; korean_name: string }[]) {
      names.set(it.market, it.korean_name);
    }
  }
  // US: company_tickers 는 ticker→CIK 라 이름 없음 → 티커를 이름으로 사용.
  return names;
}

/** 가격 파일이 존재하는 종목 목록(이름 부착, 이름/심볼 순 정렬). */
export async function listUniverse(market: Market): Promise<UniverseItem[]> {
  const cached = cache.get(market);
  if (cached) return cached;

  const [files, names] = await Promise.all([
    listData(pricesDir(market)),
    loadNames(market),
  ]);
  const items = files
    .filter((f) => f.endsWith(".parquet"))
    .map((f) => {
      const symbol = f.slice(0, -".parquet".length);
      return { symbol, name: names.get(symbol) ?? symbol };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  cache.set(market, items);
  return items;
}
