/**
 * 캐싱된 과거 데이터(`data/`) 접근 레이어. [owner: P1]
 * 가격(parquet)·유니버스·펀더멘털·뉴스/공시를 자산군(US/KR/COIN) 공통 API 로 노출.
 * ⚠️ 전부 서버 전용(fs) — 클라이언트가 아닌 API 라우트/서버 컴포넌트에서만 import.
 */
export { readPriceSeries, latestQuote } from "./prices";
export type { Candle, LatestQuote } from "./prices";
export { listUniverse } from "./universe";
export type { UniverseItem } from "./universe";
export { readFundamentals } from "./fundamentals";
export type { Fundamentals, FundamentalQuarter } from "./fundamentals";
export { readFeed } from "./news";
export type { FeedItem } from "./news";
export { readMacro, MACRO_SOURCE } from "./macro";
export type { MacroIndicator, MacroPoint } from "./macro";
