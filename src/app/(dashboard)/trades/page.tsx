"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { getTrades, sellTrade, type TradeDTO } from "@/lib/api-client";

type TradeView = "position" | "closed";

function fmtDuration(min?: number) {
  if (min == null) return "—";
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}
function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function TradesPage() {
  const router = useRouter();
  const [view, setView] = useState<TradeView>("position");
  const [trades, setTrades] = useState<TradeDTO[] | null>(null);
  const [mocked, setMocked] = useState(false);
  const [sellingId, setSellingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getTrades().then(({ data, mocked }) => {
      if (!alive) return;
      setTrades(data);
      setMocked(mocked);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSell(trade: TradeDTO) {
    setSellingId(trade.id);
    try {
      const { data } = await sellTrade(trade);
      router.push(`/reports?tradeId=${data.tradeId}`);
    } finally {
      setSellingId(null);
    }
  }

  const open = trades?.filter((t) => t.status === "OPEN") ?? [];
  const closed = trades?.filter((t) => t.status === "CLOSED") ?? [];

  const MockBadge = mocked ? (
    <div className="mb-4 inline-flex items-center gap-1.5 bg-[#FFF7E6] border border-[#E6C200]/40 px-2.5 py-1">
      <span className="text-[10px] font-bold text-[#9A7B00] tracking-wider uppercase">mock</span>
      <span className="text-[10px] text-[#9A7B00]">API 미연동 — 목 데이터로 동작 중</span>
    </div>
  ) : null;

  const Tabs = (
    <div className="grid grid-cols-2 gap-0.5 bg-muted mb-6 max-w-xs">
      {([["position", "보유 중"], ["closed", "거래 보고서"]] as [TradeView, string][]).map(([v, label]) => (
        <button key={v} onClick={() => setView(v)}
          className={`py-2 text-sm font-bold transition-all ${view === v ? "bg-card text-foreground" : "bg-transparent text-muted-foreground"}`}>
          {label}
        </button>
      ))}
    </div>
  );

  if (!trades) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 size={16} className="animate-spin" /> 거래 불러오는 중...
      </div>
    );
  }

  // ─── 거래 보고서(청산) 목록 ───────────────────────────────────
  if (view === "closed") {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2">거래 보고서</h2>
          {MockBadge}
          {Tabs}
          {closed.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 청산된 거래가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {closed.map((t) => {
                const loss = (t.pnlPct ?? 0) < 0;
                const color = loss ? "#B83535" : "#3D9E72";
                const displayName = t.company || t.symbol;
                return (
                  <div key={t.id} className="bg-card overflow-hidden" style={{ border: `1px solid ${color}30` }}>
                    <div className="px-5 py-4" style={{ background: color }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold">{displayName}</span>
                        {t.company && <span className="text-white/60 text-xs">{t.symbol}</span>}
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-white text-3xl font-black">{t.pnlPct! >= 0 ? "+" : ""}{t.pnlPct}%</span>
                        <span className="text-white/70 text-sm mb-1">{loss ? "손실" : "수익"} 거래</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="space-y-3 mb-4 relative">
                        <div className="absolute left-3 top-4 bottom-4 w-px bg-border" />
                        {[
                          { label: "매수 체결", value: `$${t.entryPrice.toFixed(2)}`, time: fmtDateTime(t.entryAt) },
                          { label: "매도 체결", value: `$${t.exitPrice?.toFixed(2) ?? "—"}`, time: fmtDateTime(t.exitAt) },
                        ].map(({ label, value, time }) => (
                          <div key={label} className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-foreground flex items-center justify-center text-[9px] font-black text-background shrink-0 z-10">{label[0]}</div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-foreground">{label}</p>
                              <p className="text-[10px] text-muted-foreground">{time}</p>
                            </div>
                            <span className="text-sm font-bold text-foreground">{value}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">보유 시간: {fmtDuration(t.holdDurationMin)}</p>
                      <Link href={`/reports?tradeId=${t.id}`}
                        className="w-full py-2.5 text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
                        style={{ background: color }}>
                        {loss ? "사망진단서 보기" : "생존보고서 보기"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── 보유 중 ─────────────────────────────────────────────────
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-2">보유 중 거래 추적</h2>
        {MockBadge}
        {Tabs}
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">보유 중인 거래가 없습니다.</p>
        ) : (
          open.map((t) => {
            const gain = (t.pnlPct ?? 0) >= 0;
            const pnlColor = gain ? "text-[#3D9E72]" : "text-[#B83535]";
            const evalAmt = t.currentPrice ? t.currentPrice * t.entryQty : t.entryPrice * t.entryQty;
            const evalPnl = (t.currentPrice ?? t.entryPrice) * t.entryQty - t.entryPrice * t.entryQty;
            const hasStop = t.stopPrice != null;
            const displayName = t.company || t.symbol;
            const tileText = displayName.length > 4 ? displayName.slice(0, 4) : displayName;
            return (
              <div key={t.id} className="mb-6">
                <div className="bg-card border border-border p-6 mb-4">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-muted flex items-center justify-center font-black text-sm text-foreground">{tileText}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">{displayName}</h3>
                          {t.company && <span className="text-xs text-muted-foreground font-mono">{t.symbol}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.market} · {fmtDateTime(t.entryAt)} 매수 체결</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">현재가</p>
                      <p className="text-2xl font-black text-foreground">${(t.currentPrice ?? t.entryPrice).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "평균 매수가", value: `$${t.entryPrice.toFixed(2)}`, color: "" },
                      { label: "보유 수량", value: `${t.entryQty}주`, color: "" },
                      { label: "평가 금액", value: `$${evalAmt.toFixed(2)}`, color: "" },
                      { label: "평가손익", value: `${evalPnl >= 0 ? "+" : ""}$${evalPnl.toFixed(2)}`, color: pnlColor },
                      { label: "수익률", value: `${gain ? "+" : ""}${t.pnlPct ?? 0}%`, color: pnlColor },
                      { label: "보유 시간", value: fmtDuration(t.holdDurationMin), color: "" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-muted/40 border border-border/40 p-3">
                        <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
                        <p className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#EBF7F3] border border-[#3D9E72]/20 p-3">
                      <p className="text-[9px] text-[#3D9E72] mb-1 font-black tracking-wider uppercase">목표가</p>
                      <p className="text-sm font-bold text-[#3D9E72] mb-2">{t.targetPrice ? `$${t.targetPrice.toFixed(2)}` : "—"}</p>
                      <div className="h-1 bg-[#3D9E72]/15 overflow-hidden"><div className="h-full bg-[#3D9E72]" style={{ width: "55%" }} /></div>
                    </div>
                    <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-3">
                      <p className="text-[9px] text-[#B83535] mb-1 font-black tracking-wider uppercase">손절가</p>
                      <p className="text-sm font-bold text-[#B83535] mb-2">{hasStop ? `$${t.stopPrice!.toFixed(2)}` : "미설정"}</p>
                      <div className="h-1 bg-[#B83535]/15 overflow-hidden"><div className="h-full bg-[#B83535]" style={{ width: "20%" }} /></div>
                    </div>
                  </div>
                </div>
                {hasStop && t.targetPrice != null ? (
                  <div className="bg-[#EBF7F3] border-l-4 border-[#3D9E72] px-5 py-4 mb-5 flex items-start gap-3">
                    <CheckCircle size={14} className="text-[#3D9E72] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-[#2A7A55] mb-0.5">현재 거래는 유언장 제4조를 지키고 있습니다.</p>
                      <p className="text-xs text-[#2A7A55]/70">제4조: 목표 수익률과 손절 기준을 먼저 작성한다. — 두 기준 모두 입력됨.</p>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-3 gap-3">
                  <button disabled={sellingId === t.id}
                    className="py-3 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">일부 매도</button>
                  <button onClick={() => handleSell(t)} disabled={sellingId === t.id}
                    className="py-3 bg-[#B83535] text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                    {sellingId === t.id ? <><Loader2 size={13} className="animate-spin" /> 매도 중...</> : "전량 매도"}
                  </button>
                  <button disabled={sellingId === t.id}
                    className="py-3 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">손절 기준 수정</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
