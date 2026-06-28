"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle, XCircle, Scroll, Loader2, Search, TrendingUp,
  Newspaper, FileBarChart, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Brush,
} from "recharts";
import { WillPrecheckModal } from "@/components/will-precheck-modal";
import { getQuote, precheck, execute, type ExecuteResult } from "@/lib/api-client";
import {
  MARKET_META, formatPrice, formatPct, formatCompact, formatFinancial, PROFIT, LOSS,
} from "@/lib/format";
import { checkOrder } from "@/lib/rules/engine";
import type { Market, RuleType } from "@prisma/client";
import type { Quote } from "@/lib/broker/types";
import type { OrderDraft, SuggestedAction, Violation, ClauseRule, MarketData } from "@/lib/rules/types";
import type { UniverseItem, Candle, Quarter, FeedItem, InitialSymbolData } from "./types";

type Step = "form" | "confirm";
type SideLabel = "매수" | "매도";
type PriceLabel = "시장가" | "지정가";

const MARKETS: Market[] = ["KR", "US", "COIN"];
const REASON_OTHER = "기타 (직접 입력)";

/** "$250.00" / "250" 등에서 숫자만 파싱. 비어있으면 undefined. */
function parseMoney(s: string): number | undefined {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? undefined : n;
}

// ─── 상단: 검색 + 자산군 선택 + 종목 상세/주문 ─────────────────────────
export function TradeClient({
  initialMarket,
  initialSymbol,
  initialName,
  initialAction,
  initialQty,
  initial,
}: {
  initialMarket: Market;
  initialSymbol: string | null;
  initialName: string;
  initialAction: string | null;
  initialQty: string | null;
  initial: InitialSymbolData | null;
}) {
  const [market, setMarket] = useState<Market>(initialMarket);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniverseItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UniverseItem | null>(
    initialSymbol ? { symbol: initialSymbol, name: initialName || initialSymbol } : null,
  );
  // 서버(SSR)가 채워준 초기 종목 데이터. 사용자가 다른 종목/시장을 고르면 버린다.
  const [seed, setSeed] = useState<InitialSymbolData | null>(initial);
  // 주문 단계(워크스페이스에서 끌어올림) — 확인 화면에선 상단 검색 헤더를 숨긴다.
  const [step, setStep] = useState<Step>("form");

  // 검색 (디바운스) — 결과는 검색창 아래 드롭다운으로만 노출.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      try {
        const r = await fetch(
          `/api/market/universe?market=${market}&q=${encodeURIComponent(query)}&limit=20`,
          { signal: ctrl.signal },
        );
        const d = await r.json();
        setResults(d.items ?? []);
      } catch { /* aborted */ }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [market, query]);

  function onMarket(m: Market) {
    setMarket(m);
    setQuery("");
    setResults([]);
    setSelected(null);
    setSeed(null);
  }

  function pick(it: UniverseItem) {
    setSelected(it);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSeed(null);
  }

  // SSR 시드는 최초 선택 종목(initialSymbol)에만 적용한다.
  const wsInitial =
    seed && selected && selected.symbol === initialSymbol && market === initialMarket
      ? seed
      : undefined;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {step !== "confirm" && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">거래하기</h1>
          <p className="text-sm text-muted-foreground mb-4">
            종목을 검색해 시세·차트·재무·뉴스를 확인하고 바로 주문하세요.
          </p>
          <div className="flex items-center gap-3">
            {/* 검색창 */}
            <div className="relative flex-1 max-w-xl">
              <div className="flex items-center gap-2 bg-card border border-border px-3 py-2.5">
                <Search size={15} className="text-muted-foreground shrink-0" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 150)}
                  placeholder={market === "KR" ? "종목명·코드 검색" : market === "US" ? "티커 검색" : "코인명·마켓 검색"}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              {open && query.trim() && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-card border border-border shadow-lg max-h-80 overflow-auto">
                  {results.map((it) => (
                    <button key={it.symbol} onMouseDown={() => pick(it)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left border-b border-border/40 last:border-0 hover:bg-muted transition-colors">
                      <span className="text-sm font-medium text-foreground truncate">{it.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">{it.symbol}</span>
                    </button>
                  ))}
                  {results.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">검색 결과가 없습니다.</p>
                  )}
                </div>
              )}
            </div>
            {/* 자산군 선택 */}
            <div className="flex gap-0.5 bg-muted p-0.5">
              {MARKETS.map((m) => (
                <button key={m} onClick={() => onMarket(m)}
                  className={`px-4 py-2 text-sm font-bold transition-all ${
                    market === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {MARKET_META[m].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {selected ? (
          <TradeWorkspace key={`${market}:${selected.symbol}`} market={market} item={selected} initial={wsInitial} initialAction={initialAction} initialQty={initialQty} onStepChange={setStep} />
        ) : (
          <div className="bg-card border border-border min-h-[420px] flex flex-col items-center justify-center text-center p-10">
            <TrendingUp size={28} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">위 검색창에서 종목을 선택하면<br />시세·차트·재무·뉴스와 주문 화면이 나타납니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 종목 상세(차트/재무/뉴스) + 주문 패널 ──────────────────────────────
function TradeWorkspace({ market, item, initial, initialAction, initialQty, onStepChange }: { market: Market; item: UniverseItem; initial?: InitialSymbolData; initialAction?: string | null; initialQty?: string | null; onStepChange?: (step: Step) => void }) {
  const { symbol, name } = item;
  const displayName = name || symbol;

  // 시세 / 차트 / 재무 / 뉴스 — initial(SSR)이 있으면 그 값으로 첫 렌더를 채운다.
  const [quote, setQuote] = useState<Quote | null>(initial?.quote ?? null);
  const [quoteMocked, setQuoteMocked] = useState(false);
  const [candles, setCandles] = useState<Candle[]>(initial?.candles ?? []);
  const [quarters, setQuarters] = useState<Quarter[] | null>(initial?.quarters ?? null);
  const [feed, setFeed] = useState<FeedItem[]>(initial?.feed ?? []);
  const [tab, setTab] = useState<"fund" | "news">(market === "COIN" ? "news" : "fund");
  const [loading, setLoading] = useState(!initial);
  const [view, setView] = useState<{ start: number; end: number } | null>(
    initial ? windowFor(initial.candles, 6) : null,
  );
  const [range, setRange] = useState<string | null>("6M");

  // 주문 폼
  const [step, setStep] = useState<Step>("form");
  const [showModal, setShowModal] = useState(false);
  const [side, setSide] = useState<SideLabel>(initialAction === "sell" ? "매도" : "매수");
  const [priceType, setPriceType] = useState<PriceLabel>("시장가");
  const [qty, setQty] = useState(initialQty || "3");
  const [limitPrice, setLimitPrice] = useState(initial ? String(initial.quote.price) : "");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [reason, setReason] = useState("");
  const [reasonText, setReasonText] = useState("");
  const stopRef = useRef<HTMLInputElement>(null);

  // 검사/실행
  const [checking, setChecking] = useState(false);
  const [mocked, setMocked] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);

  // 유언장 조항 — 주문 패널 하단 실시간 체크리스트용(사용자 활성 조항, 종목과 무관).
  const [clauseRules, setClauseRules] = useState<ClauseRule[]>([]);
  const [clausesLoaded, setClausesLoaded] = useState(false);

  // 거래 후 정보 입력(확인 화면) — 의사결정 원인 + (위반 시) 강행 사유.
  const [reasonInput, setReasonInput] = useState("");
  const [forceReasonInput, setForceReasonInput] = useState("");
  const [savingReason, setSavingReason] = useState(false);

  useEffect(() => {
    if (initial) return; // SSR로 이미 채워짐 — 클라이언트 재요청 불필요
    let active = true;
    const base = `market=${market}&symbol=${encodeURIComponent(symbol)}`;
    (async () => {
      const [qr, s, f, n] = await Promise.all([
        getQuote(market, symbol),
        fetch(`/api/market/series?${base}&limit=2000`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/fundamentals?${base}&limit=8`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/market/news?${base}&limit=30`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!active) return;
      const cs: Candle[] = s?.candles ?? [];
      setQuote(qr.data);
      setQuoteMocked(qr.mocked);
      setLimitPrice(String(qr.data.price));
      setCandles(cs);
      setView(windowFor(cs, 6)); // 기본 6개월 구간
      setQuarters(f?.quarters ?? null);
      setFeed(n?.items ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [market, symbol, initial]);

  // 단계 변화를 부모(TradeClient)로 끌어올린다 — 확인 화면에서 상단 헤더 숨김 처리.
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  // 유언장 조항을 한 번 읽어와 실시간 체크리스트에 쓴다(사용자 단위 — 종목과 무관).
  useEffect(() => {
    let active = true;
    fetch("/api/clauses")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: string; ruleType: RuleType; params: Record<string, unknown> | null; displayText: string }[]) => {
        if (!active) return;
        setClauseRules(rows.map((r) => ({ id: r.id, ruleType: r.ruleType, params: r.params ?? {}, displayText: r.displayText })));
        setClausesLoaded(true);
      })
      .catch(() => { if (active) setClausesLoaded(true); });
    return () => { active = false; };
  }, []);

  const chartData = useMemo(() => candles.map((c) => ({ t: c.date, p: c.close })), [candles]);

  const qtyNum = parseFloat(qty);
  const effPrice = priceType === "지정가" ? parseMoney(limitPrice) : quote?.price;
  const amount =
    effPrice != null && qty && !isNaN(qtyNum) ? formatPrice(market, qtyNum * effPrice) : "—";

  function switchToLimit() {
    setPriceType("지정가");
    if (!limitPrice && quote) setLimitPrice(String(quote.price));
  }

  function buildDraft(): OrderDraft {
    return {
      market,
      symbol,
      side: side === "매수" ? "BUY" : "SELL",
      orderType: priceType === "시장가" ? "MARKET" : "LIMIT",
      quantity: isNaN(qtyNum) ? 0 : qtyNum,
      price: priceType === "지정가" ? parseMoney(limitPrice) : undefined,
      // 손절가는 매수에만 사용한다.
      stopPrice: side === "매수" ? parseMoney(stopLoss) : undefined,
    };
  }

  // 실시간 유언장 체크리스트 — 폼 입력/시세에 따라 각 조항의 충족(초록)/위반(빨강)을 엔진으로 평가.
  const checklist = useMemo(() => {
    if (!quote || clauseRules.length === 0) return [];
    const order = { ...buildDraft(), thesis: reason === REASON_OTHER ? reasonText : reason } as OrderDraft;
    const md: MarketData = {
      price: quote.price, prevClose: quote.prevClose, changePct: quote.changePct,
      volume: quote.volume, isPremarket: quote.isPremarket,
    };
    const violated = new Set(checkOrder(order, md, clauseRules).violations.map((v) => v.clauseId));
    return clauseRules.map((c) => ({ id: c.id, displayText: c.displayText, ok: !violated.has(c.id) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, clauseRules, side, priceType, qty, limitPrice, stopLoss, reason, reasonText]);
  const passCount = checklist.filter((c) => c.ok).length;

  async function doExecute(draft: OrderDraft, forceReason?: string, vios?: Violation[]) {
    const { data } = await execute(draft, forceReason, vios);
    setExecResult(data);
    setShowModal(false);
    setStep("confirm");
  }

  async function handleCheck() {
    if (!quote) return;
    setChecking(true);
    try {
      const draft = buildDraft();
      const { data, mocked } = await precheck(draft, quote);
      setMocked(mocked);
      // 규정 검사는 주문을 막지 않는다 — 위반을 기록해두고 주문을 진행한 뒤,
      // 확인 화면에서 의사결정 원인(+위반 시 강행 사유)을 받는다(사후 컴플라이언스).
      setViolations(data.violations ?? []);
      await doExecute(draft, undefined, data.violations);
    } finally {
      setChecking(false);
    }
  }

  function handleAction(action: SuggestedAction) {
    switch (action) {
      case "postpone":
        setShowModal(false);
        break;
      case "switch_limit":
        switchToLimit();
        setShowModal(false);
        break;
      case "reduce_amount":
        setQty((q) => {
          const n = parseFloat(q);
          return isNaN(n) ? q : String(Math.max(1, Math.floor(n / 2)));
        });
        setShowModal(false);
        break;
      case "set_stop_loss":
        setShowModal(false);
        setTimeout(() => stopRef.current?.focus(), 50);
        break;
      case "force":
        break;
    }
  }

  // ─── 확인 화면 ─────────────────────────────────────────────────
  if (step === "confirm" && quote) {
    const draft = buildDraft();
    const confirmSteps = [
      { label: "주문 요청", done: true },
      { label: "유언장 검사", done: true },
      { label: "증권사 API 전송", done: true },
      { label: "체결 대기", done: false, active: true },
    ];

    const handleSaveReason = async () => {
      if (!reasonInput.trim()) {
        alert("의사결정 원인은 필수입니다.");
        return;
      }
      if (violations.length > 0 && !forceReasonInput.trim()) {
        alert("규정 위반이 있으니 강행 사유를 입력해주세요.");
        return;
      }

      setSavingReason(true);
      try {
        await fetch("/api/orders/reason", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brokerOrderId: execResult?.brokerOrderId,
            decisionReason: reasonInput,
            forceReason: violations.length > 0 ? forceReasonInput : null,
          }),
        });
        window.location.href = "/history";
      } finally {
        setSavingReason(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="w-14 h-14 bg-[#EBF7F3] flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-[#3D9E72]" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">주문이 접수되었습니다</h2>
        <p className="text-sm text-muted-foreground mb-8">증권사 API로 주문이 전송되었습니다.</p>
        <div className="grid grid-cols-2 gap-5 mb-6">
          <div className="bg-card border border-border p-5 text-left">
            <p className="text-[9px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">주문 상세</p>
            {[
              { label: "종목", value: name ? `${name} (${symbol})` : symbol },
              { label: "주문 유형", value: `${priceType} ${side}` },
              { label: "수량", value: `${draft.quantity}주` },
              { label: "예상 주문 금액", value: formatPrice(market, draft.quantity * (draft.price ?? quote.price)) },
              {
                label: "유언장 검사 결과",
                value: violations.length ? `${violations.length}개 조항 위반 — 강행` : "통과",
                warn: violations.length > 0,
              },
              ...(execResult ? [{ label: "주문 번호", value: execResult.brokerOrderId }] : []),
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-start py-2.5 border-b border-dashed border-border last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-xs font-semibold text-right max-w-[45%] ${warn ? "text-[#B83535]" : "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border p-5">
            <p className="text-[9px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">처리 현황</p>
            <div className="space-y-3">
              {confirmSteps.map(({ label, done, active }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${done ? "bg-[#3D9E72]" : active ? "bg-[#C9A227]" : "bg-muted"}`}>
                    {done ? <CheckCircle size={11} className="text-white" /> : active ? <div className="w-1.5 h-1.5 bg-white animate-pulse" /> : <div className="w-1.5 h-1.5 bg-muted-foreground/20" />}
                  </div>
                  <span className={`text-sm flex-1 text-left ${done ? "text-foreground font-medium" : active ? "text-[#C9A227] font-semibold" : "text-muted-foreground"}`}>{label}</span>
                  {done && <CheckCircle size={11} className="text-[#3D9E72]" />}
                  {active && <div className="flex gap-0.5">{[0, 1, 2].map((j) => <div key={j} className="w-1 h-1 bg-[#C9A227] animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 mb-6">
          <p className="text-[9px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">거래 정보 기록</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-2">의사결정 원인 *</label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="예: 기술적 분석 - 저항선 돌파 / 뉴스 기반 판단 / 시장 심리"
                className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                rows={3}
              />
            </div>
            {violations.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-2">강행 사유 *</label>
                <textarea
                  value={forceReasonInput}
                  onChange={(e) => setForceReasonInput(e.target.value)}
                  placeholder="규정 위반을 무시한 이유를 기록하세요."
                  className="w-full bg-muted/50 border border-[#B83535]/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#B83535]/50 resize-none"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSaveReason}
          disabled={savingReason || !reasonInput.trim() || (violations.length > 0 && !forceReasonInput.trim())}
          className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {savingReason ? "저장 중…" : "거래 기록하고 진행"}
        </button>
      </div>
    );
  }

  // ─── 종목 상세 + 주문 입력 ─────────────────────────────────────
  const draft = quote ? buildDraft() : null;
  const up = (quote?.changePct ?? 0) >= 0;
  const color = up ? PROFIT : LOSS;
  const v = view ?? { start: 0, end: Math.max(0, chartData.length - 1) };
  const visibleLabel =
    chartData.length > 1 ? `${chartData[v.start]?.t} ~ ${chartData[v.end]?.t} · ${v.end - v.start + 1}거래일` : "";

  return (
    <div className="relative">
      {showModal && quote && draft && (
        <WillPrecheckModal
          violations={violations}
          quote={quote}
          draft={draft}
          onAction={handleAction}
          onForce={(r) => doExecute(buildDraft(), r, violations)}
          onClose={() => setShowModal(false)}
        />
      )}
      {(quoteMocked || mocked) && (
        <div className="mb-3 inline-flex items-center gap-1.5 bg-[#FFF7E6] border border-[#E6C200]/40 px-2.5 py-1">
          <span className="text-[10px] font-bold text-[#9A7B00] tracking-wider uppercase">mock</span>
          <span className="text-[10px] text-[#9A7B00]">API 미연동 — 목 데이터로 동작 중</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* 좌: 시세 + 차트 + 재무/뉴스 */}
        <div className="col-span-2 space-y-5">
          <div className="bg-card border border-border p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
                  {name && <span className="text-xs font-mono text-muted-foreground border border-border px-1.5 py-0.5">{symbol}</span>}
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 font-bold tracking-wider uppercase">{MARKET_META[market].label}</span>
                  {quote?.isPremarket && (
                    <span className="text-[10px] bg-[#FAEAEA] text-[#B83535] px-2 py-0.5 font-black tracking-wider">프리마켓</span>
                  )}
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
                  <Stat label="시장" value={quote.isPremarket ? "프리마켓" : "정규장"} />
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
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#6E6A75" }} tickLine={false} axisLine={false} minTickGap={48} />
                    <YAxis tick={{ fontSize: 9, fill: "#6E6A75" }} tickLine={false} axisLine={false}
                      domain={["auto", "auto"]} width={56} tickFormatter={(val) => formatCompact(val as number)} />
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

        {/* 우: 주문 패널 */}
        <div className="col-span-1">
          <div className="bg-card border border-border p-5 sticky top-6">
            <div className="grid grid-cols-2 gap-0.5 bg-muted mb-4">
              {(["매수", "매도"] as SideLabel[]).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  className={`py-2.5 text-sm font-bold transition-all ${side === s ? s === "매수" ? "bg-[#3D9E72] text-white" : "bg-[#B83535] text-white" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-0.5 bg-muted mb-4">
              {(["시장가", "지정가"] as PriceLabel[]).map((pt) => (
                <button key={pt} onClick={() => (pt === "지정가" ? switchToLimit() : setPriceType("시장가"))}
                  className={`py-1.5 text-xs font-semibold transition-all ${priceType === pt ? "bg-card text-foreground" : "bg-transparent text-muted-foreground"}`}>
                  {pt}
                </button>
              ))}
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">수량 (주)</label>
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
                  className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="0" />
              </div>
              {priceType === "지정가" && (
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">지정가 (주문 가격)</label>
                  <input type="text" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="주문 가격 입력" />
                </div>
              )}
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">주문 금액 (예상)</label>
                <div className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-muted-foreground">{amount}</div>
              </div>
              {side === "매수" && (
                <>
                  <div>
                    <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">손절가</label>
                    <input ref={stopRef} type="text" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="예: 손절 기준 가격" />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">목표가</label>
                    <input type="text" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="예: 목표 가격" />
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">거래 이유</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none">
                  <option value="">선택하세요</option>
                  <option>가격이 더 오를 것 같아서</option>
                  <option>계획한 진입 구간이라서</option>
                  <option>손실 만회 목적</option>
                  <option>뉴스/이슈 확인 후</option>
                  <option value={REASON_OTHER}>{REASON_OTHER}</option>
                </select>
                {reason === REASON_OTHER && (
                  <input type="text" value={reasonText} onChange={(e) => setReasonText(e.target.value)}
                    placeholder="거래 이유를 직접 입력하세요"
                    className="w-full mt-2 bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                )}
              </div>
            </div>
            {side === "매수" && parseMoney(stopLoss) == null && (
              <div className="bg-[#FAEAEA] border-l-4 border-[#B83535] px-3 py-2.5 mb-3 flex items-center gap-2">
                <AlertTriangle size={12} className="text-[#B83535] shrink-0" />
                <p className="text-[10px] text-[#B83535] leading-relaxed font-semibold">손절 기준 미입력 — 유언장 위반 가능성</p>
              </div>
            )}
            <button onClick={handleCheck} disabled={checking || !quote}
              className={`w-full py-3 text-sm font-black text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 tracking-wider disabled:opacity-50 ${side === "매수" ? "bg-[#3D9E72]" : "bg-[#B83535]"}`}>
              {checking && <Loader2 size={13} className="animate-spin" />}
              {checking ? "처리 중..." : `${side}하기`}
            </button>

            {/* 유언장 체크리스트 — 폼 입력/시세에 따라 실시간으로 충족(초록)/위반(빨강) 표시 */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] tracking-wider text-muted-foreground font-bold uppercase flex items-center gap-1.5">
                  <Scroll size={11} /> 유언장 체크리스트
                </p>
                {clausesLoaded && clauseRules.length > 0 && (
                  <span className="text-[10px] font-bold">
                    <span className={passCount === clauseRules.length ? "text-[#3D9E72]" : "text-[#B83535]"}>{passCount}</span>
                    <span className="text-muted-foreground">/{clauseRules.length} 충족</span>
                  </span>
                )}
              </div>
              {!clausesLoaded ? (
                <div className="space-y-1.5">
                  {[0, 1].map((i) => <div key={i} className="h-9 bg-muted/40 animate-pulse" />)}
                </div>
              ) : clauseRules.length === 0 ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  등록된 유언장 조항이 없습니다.{" "}
                  <a href="/will/setup" className="text-[#C9A227] font-semibold hover:underline">유언장 작성하기 →</a>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {checklist.map((c) => (
                    <div key={c.id}
                      className={`flex items-start gap-2 px-2.5 py-2 border-l-2 transition-colors ${
                        c.ok ? "border-[#3D9E72] bg-[#EBF7F3]/60" : "border-[#B83535] bg-[#FAEAEA]/60"
                      }`}>
                      {c.ok
                        ? <CheckCircle size={13} className="text-[#3D9E72] shrink-0 mt-px" />
                        : <XCircle size={13} className="text-[#B83535] shrink-0 mt-px" />}
                      <span className={`text-[11px] leading-snug ${c.ok ? "text-foreground/80" : "text-[#B83535] font-semibold"}`}>
                        {c.displayText}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
