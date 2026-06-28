import type { Market } from "@prisma/client";

/**
 * 캐싱된 과거 데이터(`data/`) 키 해석. [owner: P1]
 *
 * 파이프라인(`pipelines/`)이 자산군별로 동일 스키마로 수집해 둔 정적 파일을
 * 앱(서버)에서 읽기 위한 키 헬퍼. 가격은 parquet, 나머지는 JSON.
 *
 * 반환값은 모두 `data/` 기준 **상대 키**(예: `us/prices/AAPL.parquet`)다.
 * 실제 읽기는 `storage.ts` 가 로컬 fs 또는 원격 버킷(`DATA_BASE_URL`)으로 분기한다.
 * ⚠️ 서버 전용 — 클라이언트 컴포넌트에서 import 하지 말 것.
 */

/** 자산군 → `data/` 하위 디렉터리. Prisma Market enum(COIN/KR/US)과 매핑. */
const MARKET_DIR: Record<Market, string> = {
  US: "us",
  KR: "kr",
  COIN: "crypto",
};

export function marketDir(market: Market): string {
  return MARKET_DIR[market];
}

/** 일봉 parquet 디렉터리. 3개 자산군 동일 스키마(Date + OHLCV). */
export function pricesDir(market: Market): string {
  return `${marketDir(market)}/prices`;
}

/** 특정 종목의 가격 parquet 키. 심볼이 곧 파일명(KR:코드 / US:티커 / COIN:마켓). */
export function priceFile(market: Market, symbol: string): string {
  return `${pricesDir(market)}/${symbol}.parquet`;
}

/** 펀더멘털(정형재무) JSON 디렉터리. US 는 SEC facts 파생, KR 은 DART 파생. */
export function fundamentalsDir(market: Market): string {
  return market === "US"
    ? `${marketDir(market)}/sec/fundamentals`
    : `${marketDir(market)}/fundamentals`;
}

export function fundamentalsFile(market: Market, symbol: string): string {
  return `${fundamentalsDir(market)}/${symbol}.json`;
}

/** 국내 공시(DART) 디렉터리 — 종목별 JSON 배열. */
export function krDisclosuresFile(symbol: string): string {
  return `${marketDir("KR")}/disclosures/${symbol}.json`;
}

/** 미국 공시(SEC filings) 디렉터리 — 종목별 JSON 배열. */
export function usFilingsFile(symbol: string): string {
  return `${marketDir("US")}/sec/filings/${symbol}.json`;
}

/** 미국 뉴스(Alpaca) — 날짜별(YYYY-MM-DD.json) 파일. */
export function usNewsDir(): string {
  return `${marketDir("US")}/news`;
}

/** 국내 DART 보조 이름 매핑 파일. */
export function krDartCorpcodesFile(): string {
  return `${marketDir("KR")}/universe/dart_corpcodes.json`;
}

/** 유니버스(종목 목록) 소스 파일. */
export function universeFile(market: Market): string {
  switch (market) {
    case "KR":
      return `${marketDir("KR")}/universe/kospi200.json`;
    case "US":
      return `${marketDir("US")}/sec/company_tickers.json`;
    case "COIN":
      return `${marketDir("COIN")}/universe/markets.json`;
  }
}
