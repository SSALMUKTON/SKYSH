"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle, BookOpen, Loader2 } from "lucide-react";
import { OrnamentalDivider, CertStamp, CertSeal } from "@/components/cert-ui";
import { getReport, decideSuggestion, type ReportDTO, type SuggestionDTO } from "@/lib/api-client";

function ReportView() {
  const sp = useSearchParams();
  const tradeId = sp.get("tradeId");
  const kind = sp.get("kind");
  const resolvedTradeId = tradeId ?? (kind === "survival" ? "t-closed-aapl" : "t-open-tsla");

  const [report, setReport] = useState<ReportDTO | null>(null);
  const [mocked, setMocked] = useState(false);

  useEffect(() => {
    let alive = true;
    getReport(resolvedTradeId).then(({ data, mocked }) => {
      if (!alive) return;
      setReport(data);
      setMocked(mocked);
    });
    return () => {
      alive = false;
    };
  }, [resolvedTradeId]);

  if (!report) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 size={16} className="animate-spin" /> 보고서 불러오는 중...
      </div>
    );
  }

  const survival = report.kind === "SURVIVAL";
  const color = survival ? "#3D9E72" : "#B83535";
  const bgSoft = survival ? "#EBF7F3" : "#FAEAEA";
  const issuedDate = "2026년 6월 28일";

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {mocked && (
          <div className="mb-4 inline-flex items-center gap-1.5 bg-[#FFF7E6] border border-[#E6C200]/40 px-2.5 py-1">
            <span className="text-[10px] font-bold text-[#9A7B00] tracking-wider uppercase">mock</span>
            <span className="text-[10px] text-[#9A7B00]">API 미연동 — 목 데이터로 동작 중</span>
          </div>
        )}
        <div className="bg-card border-2 overflow-hidden relative" style={{ borderColor: `${color}40` }}>
          <div className="absolute top-5 right-5 flex flex-col items-end gap-2 pointer-events-none z-10">
            <CertStamp color={color} text={survival ? "생존확인" : "사망확인"} sub={survival ? "CERTIFIED" : "CONFIRMED"} />
            <CertSeal color={color} line1="故래소" line2="분석인증" rotate={9} />
          </div>
          <div className="bg-[#1B1B26] px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color }}>
              {survival ? "Trade Survival Report" : "Trade Death Certificate"}
            </p>
            <h2 className="text-white text-xl font-black">
              {survival ? `${report.symbol} 거래 생존보고서` : `故 ${report.symbol} 거래 사망진단서`}
            </h2>
            <p className="text-white/40 text-xs mt-1.5">{issuedDate} 발행 · 故래소 거래 분석 시스템</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="border p-4 text-center" style={{ background: bgSoft, borderColor: `${color}33` }}>
                <p className="text-[10px] font-bold mb-1 uppercase tracking-wide" style={{ color }}>최종 수익률</p>
                <p className="text-2xl font-black" style={{ color }}>{report.pnlPct >= 0 ? "+" : ""}{report.pnlPct}%</p>
              </div>
              <div className="bg-muted/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">보유 시간</p>
                <p className="text-base font-bold text-foreground">{fmtDur(report.holdDurationMin)}</p>
              </div>
              <div className="bg-muted/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">실현 손익</p>
                <p className="text-base font-bold" style={{ color }}>{report.realizedKrw >= 0 ? "+" : "-"}₩{Math.abs(report.realizedKrw).toLocaleString("ko-KR")}</p>
              </div>
            </div>
            <OrnamentalDivider color={color} />
            <div className="mb-5">
              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                {survival ? <CheckCircle size={13} style={{ color }} /> : <AlertTriangle size={13} style={{ color }} />}
                {survival ? "생존 요인" : "사망 원인"}
              </h4>
              <div className="space-y-2">
                {report.causes.map((cause, i) => (
                  <div key={i} className="flex items-center gap-3 border px-4 py-2.5" style={{ background: bgSoft, borderColor: `${color}1A` }}>
                    <span className="w-5 h-5 flex items-center justify-center shrink-0 text-white text-[10px] font-black" style={{ background: color }}>
                      {survival ? <CheckCircle size={11} className="text-white" /> : i + 1}
                    </span>
                    <span className="text-sm text-foreground">{cause}</span>
                  </div>
                ))}
              </div>
            </div>
            <OrnamentalDivider color="#C9A227" />
            <div className="bg-[#FDF8EC] border border-[#C9A227]/35 px-4 py-3.5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={12} className="text-[#C9A227]" />
                <span className="text-[11px] font-bold text-[#7A5F0E] tracking-wide">{survival ? "준수한 유언장 조항" : "위반한 유언장 조항"}</span>
              </div>
              <p className="text-sm text-foreground font-semibold">&ldquo;{report.keptOrViolatedClause}&rdquo;</p>
            </div>

            <SuggestionBlock suggestion={report.suggestion} />

            <OrnamentalDivider color={color} />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">발행인</p>
                <p className="text-xs font-semibold text-foreground">故래소 거래 분석 시스템</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{issuedDate}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">확인자 서명</p>
                <div className="w-36 border-b border-foreground/20 mb-1" />
                <p className="text-[9px] text-muted-foreground">김주식 (본인)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 조항 제안 + 승인/수정/버리기 */
function SuggestionBlock({ suggestion }: { suggestion: SuggestionDTO }) {
  const [status, setStatus] = useState<SuggestionDTO["status"]>(suggestion.status);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(suggestion.displayText);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    try {
      await decideSuggestion(suggestion.id, decision);
      setStatus(decision);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (status === "APPROVED") {
    return (
      <div className="bg-[#EBF7F3] border border-[#3D9E72]/30 px-4 py-3.5 mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle size={13} className="text-[#3D9E72]" />
          <span className="text-xs font-bold text-[#2A7A55]">유언장에 추가됨</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-3">&ldquo;{text}&rdquo;</p>
        <Link href="/will" className="inline-block py-2 px-4 bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity">
          유언장에서 보기
        </Link>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="bg-muted/30 border border-border px-4 py-3.5 mb-5">
        <p className="text-sm text-muted-foreground">제안을 버렸습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border px-4 py-3.5 mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-foreground">신규 유언장 조항 제안</span>
        <span className="text-[10px] bg-[#C9A227]/10 text-[#7A5F0E] px-2 py-0.5 font-bold">분석 제안</span>
      </div>
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring mb-2 resize-none"
        />
      ) : (
        <p className="text-sm text-foreground leading-relaxed mb-1">&ldquo;{text}&rdquo;</p>
      )}
      {suggestion.rationale && !editing && (
        <p className="text-[11px] text-muted-foreground mb-3">근거: {suggestion.rationale}</p>
      )}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button onClick={() => decide("APPROVED")} disabled={busy}
          className="py-2.5 bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : null}
          {editing ? "수정본으로 추가" : "유언장에 추가"}
        </button>
        <button onClick={() => setEditing((v) => !v)} disabled={busy}
          className="py-2.5 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">
          {editing ? "취소" : "수정하기"}
        </button>
        <button onClick={() => decide("REJECTED")} disabled={busy}
          className="py-2.5 border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
          버리기
        </button>
      </div>
    </div>
  );
}

function fmtDur(min: number) {
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">불러오는 중...</div>}>
      <ReportView />
    </Suspense>
  );
}
