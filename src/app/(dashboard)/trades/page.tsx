"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

type TradeView = "position" | "closed";

export default function TradesPage() {
  const [view, setView] = useState<TradeView>("position");

  if (view === "closed") {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">거래 보고서</h2>
          <div className="grid grid-cols-2 gap-5">
            {[
              { ticker: "TSLA", company: "Tesla, Inc.", rate: "-4.3%", tag: "손실", color: "#B83535", buyP: "$262.30", sellP: "$251.02", buyT: "2026.06.28 09:34", sellT: "2026.06.28 11:46", dur: "2시간 12분", btn: "사망진단서 보기", kind: "death" },
              { ticker: "AAPL", company: "Apple Inc.", rate: "+3.1%", tag: "수익", color: "#3D9E72", buyP: "$193.40", sellP: "$199.40", buyT: "2026.06.26 10:02", sellT: "2026.06.27 14:18", dur: "1일 4시간 16분", btn: "생존보고서 보기", kind: "survival" },
            ].map(({ ticker, company, rate, tag, color, buyP, sellP, buyT, sellT, dur, btn, kind }) => (
              <div key={ticker} className="bg-card overflow-hidden" style={{ border: `1px solid ${color}30` }}>
                <div className="px-5 py-4" style={{ background: color }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{ticker}</span>
                    <span className="text-white/60 text-xs">{company}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-white text-3xl font-black">{rate}</span>
                    <span className="text-white/70 text-sm mb-1">{tag} 거래</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-3 mb-4 relative">
                    <div className="absolute left-3 top-4 bottom-4 w-px bg-border" />
                    {[{ label: "매수 체결", value: buyP, time: buyT }, { label: "매도 체결", value: sellP, time: sellT }].map(({ label, value, time }) => (
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
                  <p className="text-xs text-muted-foreground mb-4">보유 시간: {dur}</p>
                  <Link href={`/reports?kind=${kind}`}
                    className="w-full py-2.5 text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
                    style={{ background: color }}>
                    {btn}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">보유 중 거래 추적</h2>
        <div className="bg-card border border-border p-6 mb-4">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-muted flex items-center justify-center font-black text-sm text-foreground">TSLA</div>
              <div>
                <h3 className="font-bold text-foreground">Tesla, Inc.</h3>
                <p className="text-xs text-muted-foreground">NASDAQ · 2026.06.28 14:32 매수 체결</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">현재가</p>
              <p className="text-2xl font-black text-foreground">$271.50</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "평균 매수가", value: "$262.30", color: "" },
              { label: "보유 수량", value: "3주", color: "" },
              { label: "평가 금액", value: "$814.50", color: "" },
              { label: "평가손익", value: "+$27.60", color: "text-[#3D9E72]" },
              { label: "수익률", value: "+3.5%", color: "text-[#3D9E72]" },
              { label: "보유 시간", value: "2시간 14분", color: "" },
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
              <p className="text-sm font-bold text-[#3D9E72] mb-2">$280.00</p>
              <div className="h-1 bg-[#3D9E72]/15 overflow-hidden"><div className="h-full bg-[#3D9E72]" style={{ width: "55%" }} /></div>
            </div>
            <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-3">
              <p className="text-[9px] text-[#B83535] mb-1 font-black tracking-wider uppercase">손절가</p>
              <p className="text-sm font-bold text-[#B83535] mb-2">$250.00</p>
              <div className="h-1 bg-[#B83535]/15 overflow-hidden"><div className="h-full bg-[#B83535]" style={{ width: "20%" }} /></div>
            </div>
          </div>
        </div>
        <div className="bg-[#EBF7F3] border-l-4 border-[#3D9E72] px-5 py-4 mb-5 flex items-start gap-3">
          <CheckCircle size={14} className="text-[#3D9E72] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#2A7A55] mb-0.5">현재 거래는 유언장 제4조를 지키고 있습니다.</p>
            <p className="text-xs text-[#2A7A55]/70">제4조: 목표 수익률과 손절 기준을 먼저 작성한다. — 두 기준 모두 입력됨.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button className="py-3 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">일부 매도</button>
          <button onClick={() => setView("closed")} className="py-3 bg-[#B83535] text-white text-sm font-bold hover:opacity-90 transition-opacity">전량 매도</button>
          <button className="py-3 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">손절 기준 수정</button>
        </div>
      </div>
    </div>
  );
}
