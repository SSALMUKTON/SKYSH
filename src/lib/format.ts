import type { Market } from "@prisma/client";

/** 자산군 표시 라벨/통화. 클라이언트·서버 공용(순수 함수). */
export const MARKET_META: Record<Market, { label: string; ccy: string; symbol: string }> = {
  KR: { label: "국내", ccy: "KRW", symbol: "₩" },
  US: { label: "미국", ccy: "USD", symbol: "$" },
  COIN: { label: "코인", ccy: "KRW", symbol: "₩" },
};

export function marketLabel(market: Market): string {
  return MARKET_META[market].label;
}

/** 가격 표기: 원화는 정수 구분, 달러는 소수 2자리. */
export function formatPrice(market: Market, n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const { symbol } = MARKET_META[market];
  if (market === "US") {
    return `${symbol}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // KRW: 1원 미만(코인 일부)은 소수 노출, 그 외 정수
  const frac = n < 100 ? 2 : 0;
  return `${symbol}${n.toLocaleString("ko-KR", { maximumFractionDigits: frac })}`;
}

/** 등락률 표기(부호 포함). */
export function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

/** 큰 금액 축약(거래량/재무): 1.2조 / 3.4억 / 5.6만. */
export function formatCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}조`;
  if (abs >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (abs >= 1e4) return `${(n / 1e4).toFixed(1)}만`;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

/** 재무 수치 축약(자산군 통화 기준): US=$B/$M, KR=조/억. */
export function formatFinancial(market: Market, n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (market === "US") {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `₩${formatCompact(n)}`;
}

export const PROFIT = "#3D9E72";
export const LOSS = "#B83535";
export const GOLD = "#C9A227";
