/**
 * SSR 데이터 로더(서버 전용). [owner: P2]
 * 페이지(서버 컴포넌트)에서만 import 한다 — broker/data 레이어는 fs 접근(서버 전용)이라
 * 클라이언트 번들에 들어가면 안 된다. 클라이언트가 mount 후 치던 4개 fetch 를
 * 서버에서 한 번에 읽어 첫 페인트에 실제 콘텐츠가 담기도록 한다.
 */
import { getBroker } from "@/lib/broker";
import { readPriceSeries, readFundamentals, readFeed } from "@/lib/data";
import type { Market } from "@prisma/client";
import type { InitialSymbolData } from "./types";

export async function loadSymbolData(market: Market, symbol: string): Promise<InitialSymbolData> {
  const [quote, series, fund, feed] = await Promise.all([
    getBroker().getQuote(market, symbol),
    readPriceSeries(market, symbol, 2000),
    readFundamentals(market, symbol, 8),
    readFeed(market, symbol, 30),
  ]);
  return {
    quote,
    candles: (series ?? []).map((c) => ({ date: c.date, close: c.close })),
    quarters: fund?.quarters ?? null,
    feed,
  };
}
