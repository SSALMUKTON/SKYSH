"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Brush,
} from "recharts";
import { Search, TrendingUp, Newspaper, FileBarChart, ExternalLink } from "lucide-react";
import {
  MARKET_META, formatPrice, formatPct, formatCompact, formatFinancial, PROFIT, LOSS,
} from "@/lib/format";

type Market = "KR" | "US" | "COIN";
const MARKETS: Market[] = ["KR", "US", "COIN"];

interface UniverseItem { symbol: string; name: string }
interface Quote {
  market: Market; symbol: string; price: number; prevClose: number;
  changePct: number; volume: number; asOf: string;
}
interface Candle { date: string; close: number }
interface Quarter {
  period_end: string; revenue: number | null; operating_income: number | null;
  net_income: number | null; eps_diluted: number | null; net_margin: number | null;
}
interface FeedItem { kind: "news" | "disclosure"; title: string; summary?: string; url: string; date: string; source: string }

export default function MarketPage() {
  const [market, setMarket] = useState<Market>("KR");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<UniverseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<UniverseItem | null>(null);

  // 종목 목록 (검색 디바운스)
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/market/universe?market=${market}&q=${encodeURIComponent(query)}&limit=200`,
          { signal: ctrl.signal },
        );
        const d = await r.json();
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      } catch { /* aborted */ }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [market, query]);

  const onMarket = (m: Market) => { setMarket(m); setQuery(""); setSelected(null); };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">시장 탐색</h1>
            <p className="text-sm text-muted-foreground mt-1">
              캐싱된 과거 데이터 · 국내(KRX) / 미국(SEC) / 코인(Upbit) 시세·재무·뉴스
            </p>
          </div>
          <div className="flex gap-0.5 bg-muted p-0.5">
            {MARKETS.map((m) => (
              <button key={m} onClick={() => onMarket(m)}
                className={`px-4 py-1.5 text-sm font-bold transition-all ${
                  market === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}>
                {MARKET_META[m].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* 좌: 종목 목록 */}
          <div className="col-span-1">
            <div className="bg-card border border-border">
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 bg-muted/50 border border-border px-2.5 py-2">
                  <Search size={13} className="text-muted-foreground shrink-0" />
                  <input
                    value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder={market === "KR" ? "종목명·코드 검색" : market === "US" ? "티커 검색" : "코인명·마켓 검색"}
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 tracking-wide">
                  {total.toLocaleString("ko-KR")}개 종목 · 가격 데이터 보유
                </p>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                {items.map((it) => {
                  const active = selected?.symbol === it.symbol;
                  return (
                    <button key={it.symbol} onClick={() => setSelected(it)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left border-b border-border/40 last:border-0 transition-colors ${
                        active ? "bg-foreground text-background" : "hover:bg-muted"
                      }`}>
                      <span className={`text-sm font-medium truncate ${active ? "text-background" : "text-foreground"}`}>{it.name}</span>
                      <span className={`text-[10px] font-mono shrink-0 ml-2 ${active ? "text-background/70" : "text-muted-foreground"}`}>{it.symbol}</span>
                    </button>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">검색 결과가 없습니다.</p>
                )}
              </div>
            </div>
          </div>

          {/* 우: 종목 상세 */}
          <div className="col-span-2">
            {selected ? (
              <SymbolDetail key={`${market}:${selected.symbol}`} market={market} item={selected} />
            ) : (
              <div className="bg-card border border-border h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10">
                <TrendingUp size={28} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">왼쪽에서 종목을 선택하면<br />시세·차트·재무·뉴스를 볼 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 기간 프리셋(개월). null = 전체.
const RANGES: { label: string; months: number | null }[] = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "전체", months: null },
];

/** months 개월 전 날짜 이후의 첫 캔들 인덱스(달력 기준 — 코인/주식 공통). */
function startIndexForMonths(candles: Candle[], months: number | null): number {
  if (months == null || candles.length === 0) return 0;
  const last = new Date(candles[candles.length - 1].date);
  const cutoff = new Date(last);
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const idx = candles.findIndex((c) => c.date >= cutoffStr);
  return idx < 0 ? 0 : idx;
}

function windowFor(candles: Candle[], months: number | null): { start: number; end: number } {
  return { start: startIndexForMonths(candles, months), end: Math.max(0, candles.length - 1) };
}

function SymbolDetail({ market, item }: { market: Market; item: UniverseItem }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quarters, setQuarters] = useState<Quarter[] | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<"fund" | "news">(market === "COIN" ? "news" : "fund");
  const [loading, setLoading] = useState(true);
  // 차트 가시 구간(인덱스) + 활성 기간 프리셋. 종목 선택마다 컴포넌트가 remount 되어 초기화됨.
  const [view, setView] = useState<{ start: number; end: number } | null>(null);
  const [range, setRange] = useState<string | null>("6M");

  // 컴포넌트는 종목(symbol)별로 key 되어 선택마다 새로 마운트된다 → 초기 상태가 곧 로딩 상태.
  // effect 는 첫 await 이후에만 setState 하여 동기 setState(set-state-in-effect)를 피한다.
  useEffect(() => {
    let active = true;
    const base = `market=${market}&symbol=${encodeURIComponent(item.symbol)}`;
    (async () => {
      const [q, s, f, n] = await Promise.all([
        fetch(`/api/market/quote?${base}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/series?${base}&limit=2000`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/fundamentals?${base}&limit=8`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/news?${base}&limit=30`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!active) return;
      const cs: Candle[] = s?.candles ?? [];
      setQuote(q);
      setCandles(cs);
      setView(windowFor(cs, 6)); // 기본 6개월 구간
      setQuarters(f?.quarters ?? null);
      setFeed(n?.items ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [market, item.symbol]);

  const up = (quote?.changePct ?? 0) >= 0;
  const color = up ? PROFIT : LOSS;
  const chartData = useMemo(() => candles.map((c) => ({ t: c.date, p: c.close })), [candles]);
  const v = view ?? { start: 0, end: Math.max(0, chartData.length - 1) };
  const visibleLabel =
    chartData.length > 1 ? `${chartData[v.start]?.t} ~ ${chartData[v.end]?.t} · ${v.end - v.start + 1}거래일` : "";

  return (
    <div className="space-y-5">
      {/* 헤더: 시세 */}
      <div className="bg-card border border-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
              <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{item.symbol}</span>
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 font-bold tracking-wider uppercase">{MARKET_META[market].label}</span>
            </div>
            {quote ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-foreground">{formatPrice(market, quote.price)}</span>
                <span className="text-sm font-bold" style={{ color }}>
                  {up ? "▲" : "▼"} {formatPct(quote.changePct)}
                </span>
              </div>
            ) : (
              <div className="h-9 w-40 bg-muted/60 animate-pulse" />
            )}
          </div>
          {quote && (
            <div className="flex gap-5 text-right">
              <Stat label="전일종가" value={formatPrice(market, quote.prevClose)} />
              <Stat label="거래량" value={formatCompact(quote.volume)} />
              <Stat label="기준일" value={quote.asOf} />
            </div>
          )}
        </div>
        {/* 차트 */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">일봉 차트 (종가)</span>
            <div className="flex gap-0.5">
              {RANGES.map((r) => (
                <button key={r.label}
                  onClick={() => { setRange(r.label); setView(windowFor(candles, r.months)); }}
                  className={`text-[10px] px-2 py-1 font-bold transition-colors ${
                    range === r.label ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={248}>
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#6E6A75" }} tickLine={false} axisLine={false}
                  minTickGap={48} />
                <YAxis tick={{ fontSize: 9, fill: "#6E6A75" }} tickLine={false} axisLine={false}
                  domain={["auto", "auto"]} width={56}
                  tickFormatter={(val) => formatCompact(val as number)} />
                <Tooltip
                  contentStyle={{ background: "#1A1720", border: "none", borderRadius: 0, fontSize: 11, padding: "6px 10px" }}
                  labelStyle={{ color: "rgba(245,240,230,0.4)", marginBottom: 2 }}
                  itemStyle={{ color: "#F5F0E6", fontWeight: 600 }}
                  formatter={(val) => [formatPrice(market, val as number), "종가"]}
                />
                <Area type="monotone" dataKey="p" stroke={color} strokeWidth={2} fill="url(#mktGrad)" dot={false} activeDot={{ r: 3.5, fill: color }} />
                <Brush dataKey="t" height={26} travellerWidth={8} gap={4}
                  stroke="#C9A227" fill="rgba(201,162,39,0.05)"
                  startIndex={v.start} endIndex={v.end}
                  onChange={(e) => {
                    if (typeof e.startIndex === "number" && typeof e.endIndex === "number" &&
                        (e.startIndex !== v.start || e.endIndex !== v.end)) {
                      setView({ start: e.startIndex, end: e.endIndex });
                      setRange(null);
                    }
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[248px] bg-muted/30 animate-pulse" />
          )}
          <p className="text-[10px] text-muted-foreground text-right mt-1">{visibleLabel} · 아래 막대를 드래그해 과거 구간 탐색</p>
        </div>
        {/* 주문 화면으로 */}
        <Link href="/order"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:underline underline-offset-2">
          <TrendingUp size={12} /> 이 종목 주문하러 가기 →
        </Link>
      </div>

      {/* 탭: 펀더멘털 / 뉴스 */}
      <div className="bg-card border border-border">
        <div className="flex border-b border-border">
          {market !== "COIN" && (
            <TabBtn active={tab === "fund"} onClick={() => setTab("fund")} icon={<FileBarChart size={13} />} label="펀더멘털" />
          )}
          <TabBtn active={tab === "news"} onClick={() => setTab("news")} icon={<Newspaper size={13} />}
            label={market === "KR" ? "공시" : "뉴스"} />
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-8 bg-muted/40 animate-pulse" />)}
            </div>
          ) : tab === "fund" ? (
            <FundamentalsTable market={market} quarters={quarters} />
          ) : (
            <Feed feed={feed} market={market} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold tracking-wide transition-colors ${
        active ? "text-foreground border-b-2 border-foreground -mb-px" : "text-muted-foreground hover:text-foreground"
      }`}>
      {icon}{label}
    </button>
  );
}

function FundamentalsTable({ market, quarters }: { market: Market; quarters: Quarter[] | null }) {
  if (!quarters || quarters.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">재무 데이터가 없습니다. {market === "US" ? "(외국 제출사는 분기 데이터가 비어있을 수 있습니다)" : ""}</p>;
  }
  const rows = quarters.slice(0, 6);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-[9px] font-bold text-muted-foreground tracking-widest uppercase">분기</th>
            <th className="text-right py-2 text-[9px] font-bold text-muted-foreground tracking-widest uppercase">매출</th>
            <th className="text-right py-2 text-[9px] font-bold text-muted-foreground tracking-widest uppercase">영업이익</th>
            <th className="text-right py-2 text-[9px] font-bold text-muted-foreground tracking-widest uppercase">순이익</th>
            <th className="text-right py-2 text-[9px] font-bold text-muted-foreground tracking-widest uppercase">순이익률</th>
            <th className="text-right py-2 text-[9px] font-bold text-muted-foreground tracking-widest uppercase">EPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.period_end} className="border-b border-border/40 last:border-0">
              <td className="py-2.5 font-semibold text-foreground">{q.period_end}</td>
              <td className="py-2.5 text-right text-foreground">{formatFinancial(market, q.revenue)}</td>
              <td className="py-2.5 text-right text-foreground">{formatFinancial(market, q.operating_income)}</td>
              <td className="py-2.5 text-right" style={{ color: (q.net_income ?? 0) >= 0 ? PROFIT : LOSS }}>
                {formatFinancial(market, q.net_income)}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {q.net_margin != null ? `${(q.net_margin * 100).toFixed(1)}%` : "—"}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {q.eps_diluted != null ? q.eps_diluted.toLocaleString("ko-KR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Feed({ feed, market }: { feed: FeedItem[]; market: Market }) {
  if (feed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {market === "COIN" ? "코인 뉴스 소스는 아직 제공되지 않습니다." : "표시할 뉴스/공시가 없습니다."}
      </p>
    );
  }
  return (
    <div className="space-y-0.5">
      {feed.map((it, i) => (
        <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"
          className="block px-3 py-2.5 -mx-1 hover:bg-muted transition-colors border-b border-border/30 last:border-0 group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-foreground leading-snug group-hover:underline underline-offset-2">{it.title}</p>
              {it.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.summary}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[9px] font-black px-1.5 py-0.5 tracking-wider ${
                  it.kind === "disclosure" ? "bg-[#FDF8EC] text-[#7A5F0E]" : "bg-muted text-muted-foreground"
                }`}>{it.kind === "disclosure" ? "공시" : "뉴스"}</span>
                <span className="text-[10px] text-muted-foreground">{it.source}</span>
                <span className="text-[10px] text-muted-foreground">· {it.date}</span>
              </div>
            </div>
            <ExternalLink size={12} className="text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      ))}
    </div>
  );
}
