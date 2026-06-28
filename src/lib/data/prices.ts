import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import type { Market } from "@prisma/client";
import { priceFile } from "./paths";

/**
 * 캐싱된 일봉 가격(parquet) 읽기. [owner: P1]
 *
 * 파이프라인이 저장한 parquet(인덱스 Date + 컬럼 OHLCV, 일봉/수정주가)을
 * hyparquet 로 읽어 차트/시세에 쓰는 형태로 정규화한다. 정적 파일이라
 * 프로세스 메모리에 캐시한다. ⚠️ 서버 전용.
 */

export interface Candle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const cache = new Map<string, Candle[] | null>();

function toNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return Number(v ?? 0);
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "bigint") return new Date(Number(v)).toISOString().slice(0, 10);
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/**
 * 종목의 일봉 시계열(오름차순). 파일이 없으면 null.
 * @param limit 최근 N개만 (차트용). 미지정 시 전체.
 */
export async function readPriceSeries(
  market: Market,
  symbol: string,
  limit?: number,
): Promise<Candle[] | null> {
  const key = `${market}:${symbol}`;
  let candles = cache.get(key);

  if (candles === undefined) {
    const file = priceFile(market, symbol);
    if (!existsSync(file)) {
      cache.set(key, null);
      candles = null;
    } else {
      const buf = await readFile(file);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const rows = (await parquetReadObjects({ file: ab, compressors })) as Record<
        string,
        unknown
      >[];
      candles = rows
        .map((r) => ({
          date: toDateStr(r.Date),
          open: toNum(r.Open),
          high: toNum(r.High),
          low: toNum(r.Low),
          close: toNum(r.Close),
          volume: toNum(r.Volume),
        }))
        .filter((c) => Number.isFinite(c.close) && c.close > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      cache.set(key, candles);
    }
  }

  if (candles === null) return null;
  return limit && limit > 0 ? candles.slice(-limit) : candles;
}

export interface LatestQuote {
  price: number;
  prevClose: number;
  changePct: number;
  volume: number;
  asOf: string; // YYYY-MM-DD
}

/**
 * 마지막 캔들 기준 현재가/등락률. 캐싱 데이터라 "마지막 거래일" 종가가 현재가가 된다.
 * 파일이 없으면 null → 호출측(MockBroker)이 합성값으로 폴백.
 */
export async function latestQuote(
  market: Market,
  symbol: string,
): Promise<LatestQuote | null> {
  const series = await readPriceSeries(market, symbol);
  if (!series || series.length === 0) return null;
  const last = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : last;
  const prevClose = prev.close || last.close;
  const changePct = prevClose ? ((last.close - prevClose) / prevClose) * 100 : 0;
  return {
    price: last.close,
    prevClose,
    changePct,
    volume: last.volume,
    asOf: last.date,
  };
}
