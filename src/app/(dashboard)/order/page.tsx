"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Scroll, Loader2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { WillPrecheckModal } from "@/components/will-precheck-modal";
import { getQuote, getSeries, precheck, execute, type Candle, type ExecuteResult } from "@/lib/api-client";
import { formatPrice, formatPct, formatCompact, PROFIT, LOSS } from "@/lib/format";
import type { Market } from "@prisma/client";
import type { Quote } from "@/lib/broker/types";
import type { OrderDraft, SuggestedAction, Violation } from "@/lib/rules/types";

type Step = "form" | "confirm";
type SideLabel = "매수" | "매도";
type PriceLabel = "시장가" | "지정가";

function asMarket(s: string | null): Market {
  return s === "KR" || s === "US" || s === "COIN" ? s : "US";
}

/** "$250.00" / "250" 등에서 숫자만 파싱. 비어있으면 undefined. */
function parseMoney(s: string): number | undefined {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? undefined : n;
}

function OrderForm() {
  const sp = useSearchParams();
  const market = asMarket(sp.get("market"));
  const symbol = sp.get("symbol") ?? "TSLA";
  const name = sp.get("name") ?? "";

  const [step, setStep] = useState<Step>("form");
  const [showModal, setShowModal] = useState(false);

  // 시세 / 차트
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteMocked, setQuoteMocked] = useState(false);
  const [series, setSeries] = useState<Candle[]>([]);

  // 폼
  const [side, setSide] = useState<SideLabel>("매수");
  const [priceType, setPriceType] = useState<PriceLabel>("시장가");
  const [qty, setQty] = useState("3");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [reason, setReason] = useState("");
  const stopRef = useRef<HTMLInputElement>(null);

  // 검사/실행
  const [checking, setChecking] = useState(false);
  const [mocked, setMocked] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);

  useEffect(() => {
    let alive = true;
    setQuote(null);
    getQuote(market, symbol).then(({ data, mocked }) => {
      if (!alive) return;
      setQuote(data);
      setQuoteMocked(mocked);
    });
    getSeries(market, symbol).then(({ data }) => {
      if (alive) setSeries(data);
    });
    return () => {
      alive = false;
    };
  }, [market, symbol]);

  const qtyNum = parseFloat(qty);
  const amount =
    quote && qty && !isNaN(qtyNum) ? formatPrice(market, qtyNum * quote.price) : "—";

  function buildDraft(): OrderDraft {
    return {
      market,
      symbol,
      side: side === "매수" ? "BUY" : "SELL",
      orderType: priceType === "시장가" ? "MARKET" : "LIMIT",
      quantity: isNaN(qtyNum) ? 0 : qtyNum,
      price: priceType === "지정가" && quote ? quote.price : undefined,
      stopPrice: parseMoney(stopLoss),
    };
  }

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
      if (data.ok) {
        setViolations([]);
        await doExecute(draft);
      } else {
        setViolations(data.violations);
        setShowModal(true);
      }
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
        setPriceType("지정가");
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
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-14 h-14 bg-[#EBF7F3] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-[#3D9E72]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">주문이 접수되었습니다</h2>
          <p className="text-sm text-muted-foreground mb-8">증권사 API로 주문이 전송되었습니다.</p>
          <div className="bg-card border border-border p-5 text-left mb-4">
            <p className="text-[9px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">주문 상세</p>
            {[
              { label: "종목", value: name ? `${symbol} (${name})` : symbol },
              { label: "주문 유형", value: `${priceType} ${side}` },
              { label: "수량", value: `${draft.quantity}주` },
              { label: "예상 주문 금액", value: formatPrice(market, draft.quantity * quote.price) },
              {
                label: "유언장 검사 결과",
                value: violations.length ? `${violations.length}개 조항 위반 — 강행` : "통과",
                warn: violations.length > 0,
              },
              ...(execResult ? [{ label: "주문 번호", value: execResult.brokerOrderId }] : []),
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-start py-2.5 border-b border-dashed border-border last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-xs font-semibold text-right max-w-[55%] ${warn ? "text-[#B83535]" : "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border p-5 mb-6">
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
          <Link href="/trades" className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center">
            체결 상태 보기
          </Link>
        </div>
      </div>
    );
  }

  // ─── 주문 입력 화면 ───────────────────────────────────────────
  const draft = quote ? buildDraft() : null;
  const up = (quote?.changePct ?? 0) >= 0;
  const changeColor = up ? PROFIT : LOSS;
  return (
    <div className="p-8 relative">
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
      <div className="max-w-5xl mx-auto">
        {(quoteMocked || mocked) && (
          <div className="mb-3 inline-flex items-center gap-1.5 bg-[#FFF7E6] border border-[#E6C200]/40 px-2.5 py-1">
            <span className="text-[10px] font-bold text-[#9A7B00] tracking-wider uppercase">mock</span>
            <span className="text-[10px] text-[#9A7B00]">API 미연동 — 목 데이터로 동작 중</span>
          </div>
        )}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-2xl font-bold text-foreground">{symbol}</h2>
              {name && <span className="text-sm text-muted-foreground">{name}</span>}
              {quote?.isPremarket && (
                <span className="text-[10px] bg-[#FAEAEA] text-[#B83535] px-2 py-0.5 font-black tracking-wider">프리마켓</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {quote ? (
                <>
                  <span className="text-3xl font-black text-foreground">{formatPrice(market, quote.price)}</span>
                  <span className="text-sm font-semibold" style={{ color: changeColor }}>
                    {up ? "▲" : "▼"} {formatPct(quote.changePct)}
                  </span>
                </>
              ) : (
                <span className="h-9 w-40 bg-muted animate-pulse" />
              )}
            </div>
          </div>
          <div className="flex gap-6 text-right">
            {[
              { label: "등락률", value: quote ? formatPct(quote.changePct) : "—", color: changeColor },
              { label: "거래량", value: quote ? formatCompact(quote.volume) : "—", color: "" },
              { label: "전일 종가", value: quote ? formatPrice(market, quote.prevClose) : "—", color: "" },
              { label: "시장", value: quote?.isPremarket ? "프리마켓" : "정규장", color: "" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[9px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">{label}</p>
                <p className="text-sm font-bold" style={color ? { color } : undefined}>
                  <span className={color ? "" : "text-foreground"}>{value}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <div className="bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">일봉 차트</span>
                <span className="text-[10px] text-muted-foreground">최근 {series.length}거래일 (종가)</span>
              </div>
              {series.length > 1 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={series} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={changeColor} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={changeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#6E6A75" }} tickLine={false} axisLine={false} minTickGap={48} />
                    <YAxis tick={{ fontSize: 10, fill: "#6E6A75" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={56}
                      tickFormatter={(v) => formatCompact(v as number)} />
                    <Tooltip
                      contentStyle={{ background: "#1A1720", border: "none", borderRadius: 0, fontSize: 11, padding: "8px 12px" }}
                      labelStyle={{ color: "rgba(245,240,230,0.4)", marginBottom: 2 }}
                      itemStyle={{ color: "#F5F0E6", fontWeight: 600 }}
                      formatter={(v) => [formatPrice(market, v as number), "종가"]}
                    />
                    <Area type="monotone" dataKey="p" stroke={changeColor} strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: changeColor }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[230px] bg-muted/30 animate-pulse" />
              )}
            </div>
          </div>
          <div className="col-span-1">
            <div className="bg-card border border-border p-5">
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
                  <button key={pt} onClick={() => setPriceType(pt)}
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
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">주문 금액 (예상)</label>
                  <div className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-muted-foreground">{qty ? amount : "—"}</div>
                </div>
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
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">거래 이유</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none">
                    <option value="">선택하세요</option>
                    <option>가격이 더 오를 것 같아서</option>
                    <option>계획한 진입 구간이라서</option>
                    <option>손실 만회 목적</option>
                    <option>뉴스/이슈 확인 후</option>
                    <option>기타 직접 입력</option>
                  </select>
                </div>
              </div>
              {side === "매수" && parseMoney(stopLoss) == null && (
                <div className="bg-[#FAEAEA] border-l-4 border-[#B83535] px-3 py-2.5 mb-3 flex items-center gap-2">
                  <AlertTriangle size={12} className="text-[#B83535] shrink-0" />
                  <p className="text-[10px] text-[#B83535] leading-relaxed font-semibold">손절 기준 미입력 — 유언장 위반 가능성</p>
                </div>
              )}
              <button onClick={handleCheck} disabled={checking || !quote}
                className="w-full bg-foreground text-background py-3 text-sm font-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 tracking-wider disabled:opacity-50">
                {checking ? <Loader2 size={13} className="animate-spin" /> : <Scroll size={13} />}
                {checking ? "검사 중..." : "주문 전 유언장 검사"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">불러오는 중...</div>}>
      <OrderForm />
    </Suspense>
  );
}
