/**
 * 거래하기(/order) — 서버 컴포넌트. [owner: P2]
 * URL 쿼리에 종목이 있으면 서버에서 시세·차트·재무·뉴스를 미리 읽어
 * 클라이언트(TradeClient)에 넘긴다 → 첫 페인트부터 실제 콘텐츠(SSR, 스켈레톤 X).
 * 종목 미선택(검색 우선) 진입은 즉시 렌더된다.
 * 거래 기록 페이지의 "매도"는 ?action=sell&qty= 로 들어와 폼을 미리 채운다.
 */
import { loadSymbolData } from "./initial-data";
import { TradeClient } from "./trade-client";
import type { Market } from "@prisma/client";

function asMarket(s: string | undefined): Market {
  return s === "KR" || s === "US" || s === "COIN" ? s : "US";
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const market = asMarket(first(sp.market));
  const symbol = first(sp.symbol) ?? null;
  const name = first(sp.name) ?? "";
  const action = first(sp.action) ?? null;
  const qty = first(sp.qty) ?? null;
  const initial = symbol ? await loadSymbolData(market, symbol) : null;

  return (
    <TradeClient
      initialMarket={market}
      initialSymbol={symbol}
      initialName={name}
      initialAction={action}
      initialQty={qty}
      initial={initial}
    />
  );
}
