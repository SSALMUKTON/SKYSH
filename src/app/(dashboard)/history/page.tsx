"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, X, Loader2 } from "lucide-react";
import { MARKET_META, formatPrice, formatPct, PROFIT, LOSS } from "@/lib/format";
import { getQuote } from "@/lib/api-client";

type Market = "KR" | "US" | "COIN";
const MARKETS: Market[] = ["KR", "US", "COIN"];

interface Order { side: string; orderType: string; quantity: string; price: string | null }
interface Report { id: string; kind: "DEATH" | "SURVIVAL" }
interface Trade {
  id: string; market: Market; symbol: string; company?: string; status: "OPEN" | "CLOSED";
  entryPrice: string | null; entryQty: string | null; entryAt: string | null;
  exitPrice: string | null; exitQty: string | null; exitAt: string | null;
  pnlPct: number | null; holdDurationMin: number | null;
  orders: Order[]; report: Report | null;
}

function holdLabel(min: number | null): string {
  if (min == null) return "—";
  const d = Math.floor(min / 1440);
  // 24시간 넘으면 일 단위로만 카운트
  if (d > 0) return `${d}일`;
  const h = Math.floor((min % 1440) / 60), m = min % 60;
  return [h ? `${h}시간` : "", `${m}분`].filter(Boolean).join(" ");
}

// 보유 중 거래의 현재가를 조회해 미실현 손익 계산에 사용. (key: `${market}:${symbol}`)
async function fetchOpenPrices(trades: Trade[]): Promise<Record<string, number>> {
  const opens = trades.filter((t) => t.status === "OPEN");
  const entries = await Promise.all(
    opens.map(async (t) => {
      const { data } = await getQuote(t.market, t.symbol);
      return [`${t.market}:${t.symbol}`, data.price] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export default function HistoryPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/trades");
    const d = await r.json();
    const list: Trade[] = d.trades ?? [];
    setTrades(list);
    setLoading(false);
    setPrices(await fetchOpenPrices(list));
  }, []);

  // 최초 로드: effect 본문에서 동기 setState 하지 않도록 await 이후에만 갱신.
  useEffect(() => {
    let active = true;
    (async () => {
      const r = await fetch("/api/trades");
      const d = await r.json();
      if (!active) return;
      const list: Trade[] = d.trades ?? [];
      setTrades(list);
      setLoading(false);
      const px = await fetchOpenPrices(list);
      if (active) setPrices(px);
    })();
    return () => { active = false; };
  }, []);

  async function openReport(t: Trade) {
    if (t.report) {
      router.push(`/reports?id=${t.report.id}`);
      return;
    }
    setGeneratingId(t.id);
    const r = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tradeId: t.id }),
    });
    setGeneratingId(null);
    if (r.ok) {
      const report = await r.json();
      refresh();
      router.push(`/reports?id=${report.id}`);
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">거래 기록</h1>
            <p className="text-sm text-muted-foreground mt-1">
              실시간 주문과 과거 거래가 함께 쌓입니다. 청산된 거래는 보고서를 발급할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity">
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "닫기" : "과거 거래 추가"}
            </button>
          </div>
        </div>

        {showForm && <ManualForm onDone={() => { setShowForm(false); refresh(); }} />}

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-muted/40 animate-pulse" />)}</div>
        ) : trades.length === 0 ? (
          <div className="bg-card border border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">아직 거래 기록이 없습니다. 위 “과거 거래 추가”로 매수/매도 기록을 넣어보세요.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[...trades].sort((a, b) => {
              if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
              return 0;
            }).map((t) => (
              <TradeRow
                key={t.id}
                t={t}
                currentPrice={prices[`${t.market}:${t.symbol}`]}
                onReport={() => openReport(t)}
                generating={generatingId === t.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({ t, currentPrice, onReport, generating }: { t: Trade; currentPrice?: number; onReport: () => void; generating: boolean }) {
  const router = useRouter();
  const closed = t.status === "CLOSED";
  const displayName = t.company || t.symbol;
  // 로고 타일: 글자 깨짐 방지 — 2글자만 한 줄로 표시
  const tileText = displayName.slice(0, 2);

  // 보유중·청산 모두 수익률(수익금액) 계산. 청산은 확정손익, 보유중은 현재가 기준 미실현.
  const entry = Number(t.entryPrice);
  const qty = closed ? Number(t.exitQty ?? t.entryQty) : Number(t.entryQty);
  const lastPrice = closed ? Number(t.exitPrice) : currentPrice;
  const hasPrice = lastPrice != null && Number.isFinite(lastPrice) && Number.isFinite(entry) && entry > 0;
  const pnlPct = closed ? t.pnlPct : hasPrice ? ((lastPrice! - entry) / entry) * 100 : null;
  const pnlAmt = hasPrice ? (lastPrice! - entry) * qty : null;
  const win = (pnlPct ?? 0) >= 0;
  const color = pnlPct == null ? "#6E6A75" : win ? PROFIT : LOSS;

  const goToOrder = () =>
    router.push(`/order?symbol=${t.symbol}&market=${t.market}&name=${encodeURIComponent(displayName)}`);

  return (
    <div
      onClick={goToOrder}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToOrder(); } }}
      className="bg-card border border-border p-4 cursor-pointer hover:border-foreground/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-muted flex items-center justify-center font-black text-xs text-foreground shrink-0 whitespace-nowrap leading-none">
            {tileText}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{displayName}</span>
              {t.company && <span className="text-xs text-muted-foreground font-mono">{t.symbol}</span>}
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 font-bold uppercase tracking-wider">{MARKET_META[t.market].label}</span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 tracking-wider ${
                closed ? "bg-muted text-muted-foreground" : "bg-[#EBF7F3] text-[#2A7A55]"
              }`}>{closed ? "청산" : "보유 중"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              진입 {formatPrice(t.market, entry)} × {Number(t.entryQty)}
              {closed && t.exitPrice && <> → 청산 {formatPrice(t.market, Number(t.exitPrice))}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            {pnlPct == null ? (
              <p className="text-lg font-black text-muted-foreground">—</p>
            ) : (
              <p className="text-lg font-black" style={{ color }}>
                {formatPct(pnlPct)}
                {pnlAmt != null && (
                  <span className="text-xs font-bold ml-1">
                    ({pnlAmt >= 0 ? "+" : "-"}{formatPrice(t.market, Math.abs(pnlAmt))})
                  </span>
                )}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {closed ? `보유 ${holdLabel(t.holdDurationMin)}` : "미실현"}
            </p>
          </div>
          {!closed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/order?symbol=${t.symbol}&market=${t.market}&name=${encodeURIComponent(displayName)}&action=sell&qty=${t.entryQty}`);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-foreground border border-border px-2.5 py-1.5 hover:bg-muted transition-colors"
            >
              판매하기
            </button>
          )}
          {closed && (
            <button
              onClick={(e) => { e.stopPropagation(); onReport(); }}
              disabled={generating}
              className="inline-flex items-center gap-1 text-xs font-bold text-foreground border border-border px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              {t.report ? "보고서" : "보고서 발급"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const [market, setMarket] = useState<Market>("KR");
  const [symbol, setSymbol] = useState("");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [entryPrice, setEntryPrice] = useState("");
  const [entryQty, setEntryQty] = useState("");
  const [entryAt, setEntryAt] = useState("");
  const [withExit, setWithExit] = useState(true);
  const [exitPrice, setExitPrice] = useState("");
  const [exitQty, setExitQty] = useState("");
  const [exitAt, setExitAt] = useState("");
  const [thesis, setThesis] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!symbol.trim() || !entryPrice || !entryQty || !entryAt) {
      setErr("종목·진입가·수량·진입시각은 필수입니다.");
      return;
    }
    const body: Record<string, unknown> = {
      market, symbol: symbol.trim().toUpperCase(), orderType,
      entryPrice: Number(entryPrice), entryQty: Number(entryQty),
      entryAt: new Date(entryAt).toISOString(),
    };
    if (thesis.trim()) body.thesis = thesis.trim();
    if (stopPrice) body.stopPrice = Number(stopPrice);
    if (withExit) {
      if (!exitPrice || !exitQty || !exitAt) { setErr("청산을 포함하려면 청산가·수량·시각을 모두 채워주세요."); return; }
      body.exitPrice = Number(exitPrice); body.exitQty = Number(exitQty);
      body.exitAt = new Date(exitAt).toISOString();
    }
    setBusy(true);
    const r = await fetch("/api/trades", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.issues?.[0]?.message ?? d.error ?? "저장 실패");
      return;
    }
    onDone();
  };

  const field = "w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const lbl = "text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase";

  return (
    <div className="bg-card border border-border p-5 mb-5">
      <p className="text-[10px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">과거 거래 입력</p>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <label className={lbl}>시장</label>
          <div className="flex gap-0.5 bg-muted p-0.5">
            {MARKETS.map((m) => (
              <button key={m} onClick={() => setMarket(m)}
                className={`flex-1 py-1.5 text-xs font-bold transition-all ${market === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                {MARKET_META[m].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={lbl}>종목 {market === "KR" ? "코드" : market === "COIN" ? "마켓" : "티커"}</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className={field}
            placeholder={market === "KR" ? "005930" : market === "COIN" ? "KRW-BTC" : "AAPL"} />
        </div>
        <div>
          <label className={lbl}>주문유형</label>
          <div className="flex gap-0.5 bg-muted p-0.5">
            {(["MARKET", "LIMIT"] as const).map((o) => (
              <button key={o} onClick={() => setOrderType(o)}
                className={`flex-1 py-1.5 text-xs font-semibold transition-all ${orderType === o ? "bg-card text-foreground" : "text-muted-foreground"}`}>
                {o === "MARKET" ? "시장가" : "지정가"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={lbl}>손절가 (선택)</label>
          <input value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} className={field} placeholder="-" inputMode="decimal" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className={lbl}>진입가</label>
          <input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className={field} placeholder="262.30" inputMode="decimal" />
        </div>
        <div>
          <label className={lbl}>수량</label>
          <input value={entryQty} onChange={(e) => setEntryQty(e.target.value)} className={field} placeholder="3" inputMode="decimal" />
        </div>
        <div>
          <label className={lbl}>진입 시각</label>
          <input type="datetime-local" value={entryAt} onChange={(e) => setEntryAt(e.target.value)} className={field} />
        </div>
      </div>

      <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
        <input type="checkbox" checked={withExit} onChange={(e) => setWithExit(e.target.checked)} className="accent-foreground" />
        <span className="text-xs font-semibold text-foreground">청산(매도)까지 입력 — 손익·보유시간 계산 + 보고서 발급 대상</span>
      </label>

      {withExit && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className={lbl}>청산가</label>
            <input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className={field} placeholder="251.02" inputMode="decimal" />
          </div>
          <div>
            <label className={lbl}>수량</label>
            <input value={exitQty} onChange={(e) => setExitQty(e.target.value)} className={field} placeholder="3" inputMode="decimal" />
          </div>
          <div>
            <label className={lbl}>청산 시각</label>
            <input type="datetime-local" value={exitAt} onChange={(e) => setExitAt(e.target.value)} className={field} />
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className={lbl}>매수 이유 (선택)</label>
        <input value={thesis} onChange={(e) => setThesis(e.target.value)} className={field} placeholder="예: 프리마켓 급등 추격" />
      </div>

      {err && <p className="text-xs text-[#B83535] mb-3 font-semibold">{err}</p>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy}
          className="bg-foreground text-background px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
          {busy ? "저장 중…" : "거래 기록 저장"}
        </button>
      </div>
    </div>
  );
}
