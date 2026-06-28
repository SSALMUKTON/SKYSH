"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Scroll } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { WillPrecheckModal } from "@/components/will-precheck-modal";
import { CHART_DATA } from "@/lib/mock-data";

type Step = "form" | "confirm";
type Side = "매수" | "매도";
type PriceType = "시장가" | "지정가";

export default function OrderPage() {
  const [step, setStep] = useState<Step>("form");
  const [showModal, setShowModal] = useState(false);
  const [side, setSide] = useState<Side>("매수");
  const [priceType, setPriceType] = useState<PriceType>("시장가");
  const [qty, setQty] = useState("3");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [reason, setReason] = useState("");

  const amount = qty && !isNaN(parseFloat(qty))
    ? Math.round(parseFloat(qty) * 275.3 * 1356).toLocaleString("ko-KR")
    : "—";

  if (step === "confirm") {
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
              { label: "종목", value: "TSLA (Tesla, Inc.)" },
              { label: "주문 유형", value: `${priceType} 매수` },
              { label: "수량", value: `${qty || "3"}주` },
              { label: "예상 주문 금액", value: "₩1,119,282" },
              { label: "유언장 검사 결과", value: "제2조 위반 경고 — 무시하고 진행", warn: true },
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

  return (
    <div className="p-8 relative">
      {showModal && (
        <WillPrecheckModal
          onClose={() => setShowModal(false)}
          onProceed={() => { setShowModal(false); setStep("confirm"); }}
        />
      )}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-2xl font-bold text-foreground">TSLA</h2>
              <span className="text-sm text-muted-foreground">Tesla, Inc.</span>
              <span className="text-[10px] bg-[#FAEAEA] text-[#B83535] px-2 py-0.5 font-black tracking-wider">프리마켓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-foreground">$275.30</span>
              <span className="text-sm font-semibold text-[#B83535]">▼ -8.42 (-2.97%)</span>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            {[
              { label: "1시간 변동", value: "+3.2%", color: "text-[#3D9E72]" },
              { label: "거래량", value: "12.4M", color: "text-foreground" },
              { label: "거래량 스파이크", value: "+230%", color: "text-[#B83535]" },
              { label: "시장 세션", value: "프리마켓", color: "text-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[9px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <div className="bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">1일 차트 (USD)</span>
                <div className="flex gap-0.5">
                  {["1분", "5분", "15분", "1시간", "1일"].map((t, i) => (
                    <button key={t} className={`text-[10px] px-2.5 py-1 font-medium transition-colors ${i === 2 ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={CHART_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B83535" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#B83535" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#6E6A75" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6E6A75" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#1A1720", border: "none", borderRadius: 0, fontSize: 11, padding: "8px 12px" }}
                    labelStyle={{ color: "rgba(245,240,230,0.4)", marginBottom: 2 }}
                    itemStyle={{ color: "#F5F0E6", fontWeight: 600 }}
                    formatter={(v) => [`$${v}`, "현재가"]}
                  />
                  <Area type="monotone" dataKey="p" stroke="#B83535" strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: "#B83535" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-1">
            <div className="bg-card border border-border p-5">
              <div className="grid grid-cols-2 gap-0.5 bg-muted mb-4">
                {(["매수", "매도"] as Side[]).map((s) => (
                  <button key={s} onClick={() => setSide(s)}
                    className={`py-2.5 text-sm font-bold transition-all ${side === s ? s === "매수" ? "bg-[#3D9E72] text-white" : "bg-[#B83535] text-white" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-0.5 bg-muted mb-4">
                {(["시장가", "지정가"] as PriceType[]).map((pt) => (
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
                  <div className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-muted-foreground">{qty ? `₩${amount}` : "—"}</div>
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">손절가</label>
                  <input type="text" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="예: $250.00" />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">목표가</label>
                  <input type="text" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="예: $290.00" />
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
              <div className="bg-[#FAEAEA] border-l-4 border-[#B83535] px-3 py-2.5 mb-3 flex items-center gap-2">
                <AlertTriangle size={12} className="text-[#B83535] shrink-0" />
                <p className="text-[10px] text-[#B83535] leading-relaxed font-semibold">유언장 제2조 위반 가능성 감지</p>
              </div>
              <button onClick={() => setShowModal(true)}
                className="w-full bg-foreground text-background py-3 text-sm font-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 tracking-wider">
                <Scroll size={13} />
                주문 전 유언장 검사
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
