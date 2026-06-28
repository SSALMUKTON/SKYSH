/** /order(거래하기) 페이지 공용 타입. 런타임 코드 없음 → 서버/클라이언트 양쪽에서 import 가능. */
import type { Quote } from "@/lib/broker/types";

// 거시지표 타입은 data 레이어에 정의 — type-only 재노출이라 클라이언트 번들엔 fs 가 안 들어간다.
export type { MacroIndicator, MacroPoint } from "@/lib/data/macro";

export interface UniverseItem { symbol: string; name: string }
export interface Candle { date: string; close: number }
export interface Quarter {
  period_end: string; revenue: number | null; operating_income: number | null;
  net_income: number | null; eps_diluted: number | null; net_margin: number | null;
}
export interface FeedItem {
  kind: "news" | "disclosure"; title: string; summary?: string; url: string; date: string; source: string;
}

/** 서버(SSR)에서 미리 읽어 클라이언트로 넘기는 선택 종목의 초기 데이터. */
export interface InitialSymbolData {
  quote: Quote;
  candles: Candle[];
  quarters: Quarter[] | null;
  feed: FeedItem[];
}
