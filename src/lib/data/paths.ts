import type { Market } from "@prisma/client";

/**
 * 캐싱된 과거 데이터(`data/`) 경로 해석. [owner: P1]
 *
 * 파이프라인(`pipelines/`)이 자산군별로 동일 스키마로 수집해 둔 정적 파일을
 * 앱(서버)에서 읽기 위한 경로 헬퍼. 가격은 parquet, 나머지는 JSON.
 * ⚠️ 서버 전용 — fs 를 쓰므로 클라이언트 컴포넌트에서 import 하지 말 것.
 *
 * 경로는 path.join 대신 템플릿 문자열(슬래시)로 만든다 — 번들러(Turbopack)가
 * path.join(DATA_DIR, ...) 를 동적 모듈 패턴으로 오인해 data/ 전체를 추적하는
 * 경고/과다번들을 피하기 위함. Node fs 는 Windows 에서도 슬래시를 허용한다.
 */

/** 자산군 → `data/` 하위 디렉터리. Prisma Market enum(COIN/KR/US)과 매핑. */
const MARKET_DIR: Record<Market, string> = {
  US: "us",
  KR: "kr",
  COIN: "crypto",
};

export const DATA_DIR = `${process.cwd().replace(/\\/g, "/")}/data`;

export function marketDir(market: Market): string {
  return `${DATA_DIR}/${MARKET_DIR[market]}`;
}

/** 일봉 parquet 디렉터리. 3개 자산군 동일 스키마(Date + OHLCV). */
export function pricesDir(market: Market): string {
  return `${marketDir(market)}/prices`;
}

/** 특정 종목의 가격 parquet 경로. 심볼이 곧 파일명(KR:코드 / US:티커 / COIN:마켓). */
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
