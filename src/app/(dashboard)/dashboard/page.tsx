"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Shield, BarChart2, FileText, CheckCircle, Scroll,
  Bell, AlertTriangle, AlertCircle,
} from "lucide-react";

interface Clause {
  id: string;
  ruleType: string;
  displayText: string;
  violationCount: number;
}

export default function DashboardPage() {
  const [clauses, setClauses] = useState<Clause[]>([]);

  useEffect(() => {
    fetch("/api/clauses").then((r) => r.json()).then(setClauses);
  }, []);

  const topViolations = [...clauses]
    .sort((a, b) => b.violationCount - a.violationCount)
    .slice(0, 3);
  const maxViolations = topViolations[0]?.violationCount ?? 1;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">홈</h1>
            <p className="text-sm text-muted-foreground mt-1">{today} · 프리마켓 진행 중</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#FDF8EC] border border-[#C9A227]/30 px-3 py-1.5">
            <Bell size={12} className="text-[#C9A227]" />
            <span className="text-xs font-semibold text-[#7A5F0E]">유언장 알림 1건</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: "연결 계좌", value: "KIS 한국투자", icon: Shield, color: "text-foreground" },
            { label: "보유 종목", value: "3 종목", icon: BarChart2, color: "text-foreground" },
            { label: "사망진단서", value: "7 건", icon: FileText, color: "text-[#B83535]" },
            { label: "생존보고서", value: "4 건", icon: CheckCircle, color: "text-[#3D9E72]" },
            { label: "유언장 조항", value: `${clauses.length} 조항`, icon: Scroll, color: "text-[#C9A227]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border p-4">
              <Icon size={14} className={`${color} mb-3`} />
              <p className="text-[10px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
              <p className="text-base font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          <div>
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wider uppercase">
              <AlertTriangle size={12} className="text-[#B83535]" />
              오늘의 유언장 경고
            </h3>
            <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-4 h-[calc(100%-2rem)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-[#B83535] tracking-wider">제2조 위반 가능성</span>
                <span className="text-[9px] text-muted-foreground border border-border bg-card px-1.5 py-0.5">프리마켓</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed mb-4">
                TSLA가 전일 대비 <strong>+8.4%</strong> 상승 중입니다. 프리마켓 갭상 직후 매수는 유언장 제2조를 위반할 수 있습니다.
              </p>
              <Link href="/order?market=US&symbol=TSLA" className="text-xs font-black text-[#B83535] hover:underline underline-offset-2 tracking-wide">
                주문 화면에서 확인 →
              </Link>
            </div>
          </div>

          <div className="col-span-2">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wider uppercase">
              <FileText size={12} className="text-muted-foreground" />
              최근 거래 보고서
            </h3>
            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["종목", "구분", "수익률", "날짜", ""].map((h) => (
                      <th key={h} className={`px-4 py-2.5 text-[9px] font-bold text-muted-foreground tracking-widest uppercase ${h === "수익률" || h === "날짜" || h === "" ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ticker: "TSLA", type: "death", rate: "-4.3%", date: "2026.06.22" },
                    { ticker: "AAPL", type: "survival", rate: "+3.1%", date: "2026.06.18" },
                    { ticker: "NVDA", type: "death", rate: "-7.8%", date: "2026.06.10" },
                    { ticker: "MSFT", type: "survival", rate: "+2.4%", date: "2026.05.28" },
                  ].map(({ ticker, type, rate, date }) => (
                    <tr key={date} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-foreground">{ticker}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 ${
                          type === "death" ? "bg-[#FAEAEA] text-[#B83535]" : "bg-[#EBF7F3] text-[#3D9E72]"
                        }`}>
                          {type === "death" ? "사망진단서" : "생존보고서"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold text-right ${type === "death" ? "text-[#B83535]" : "text-[#3D9E72]"}`}>
                        {rate}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-right">{date}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reports?kind=${type === "death" ? "death" : "survival"}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wider uppercase">
            <AlertCircle size={12} className="text-[#C9A227]" />
            가장 많이 위반한 조항
          </h3>
          {topViolations.length === 0 ? (
            <p className="text-xs text-muted-foreground">아직 위반 기록이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {topViolations.map((c, i) => (
                <div key={c.id} className="bg-card border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#C9A227]">제{i + 1}조</span>
                    <span className="text-xs font-bold text-[#B83535]">{c.violationCount}회 위반</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{c.displayText}</p>
                  <div className="h-1 bg-muted overflow-hidden">
                    <div className="h-full bg-[#B83535]" style={{ width: `${maxViolations > 0 ? (c.violationCount / maxViolations) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
