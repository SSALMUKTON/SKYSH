import Link from "next/link";
import { AlertTriangle, CheckCircle, BookOpen, FileText } from "lucide-react";
import { OrnamentalDivider, CertStamp, CertSeal } from "@/components/cert-ui";
import { SuggestionActions } from "./suggestion-actions";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/user";
import { formatPct } from "@/lib/format";

function holdLabel(min: number | null): string {
  if (min == null) return "—";
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return [d ? `${d}일` : "", h ? `${h}시간` : "", `${m}분`].filter(Boolean).join(" ");
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const user = await getDemoUser();

  // ── 상세 뷰 ──────────────────────────────────────────────────
  if (id) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        trade: {
          select: {
            symbol: true,
            market: true,
            pnlPct: true,
            holdDurationMin: true,
            userId: true,
          },
        },
        suggestions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report || report.trade.userId !== user.id) {
      return (
        <div className="p-8">
          <p className="text-sm text-muted-foreground">보고서를 찾을 수 없습니다.</p>
          <Link href="/reports" className="text-xs text-foreground hover:underline mt-2 inline-block">← 목록으로</Link>
        </div>
      );
    }

    // 위반 조항 displayText 조회
    const violatedIds = Array.isArray(report.violatedClauses)
      ? (report.violatedClauses as string[])
      : [];
    const violatedClauses = violatedIds.length
      ? await prisma.clause.findMany({
          where: { id: { in: violatedIds } },
          select: { id: true, displayText: true },
        })
      : [];

    const isDeath = report.kind === "DEATH";
    const kindColor = isDeath ? "#B83535" : "#3D9E72";
    const causes = Array.isArray(report.causes) ? (report.causes as string[]) : [];
    const createdDate = report.createdAt.toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric",
    });

    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/reports"
            className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 transition-colors"
          >
            ← 목록으로
          </Link>

          <div
            className="bg-card overflow-hidden relative mt-4"
            style={{ border: `2px solid ${kindColor}25` }}
          >
            {/* 인증 도장 */}
            <div className="absolute top-5 right-5 flex flex-col items-end gap-2 pointer-events-none z-10">
              <CertStamp
                color={kindColor}
                text={isDeath ? "사망확인" : "생존확인"}
                sub={isDeath ? "CONFIRMED" : "CERTIFIED"}
              />
              <CertSeal color={kindColor} line1="故래소" line2="분석인증" rotate={9} />
            </div>

            {/* Header */}
            <div className="bg-[#1B1B26] px-6 py-5">
              <p
                className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5"
                style={{ color: kindColor }}
              >
                {isDeath ? "Trade Death Certificate" : "Trade Survival Report"}
              </p>
              <h2 className="text-white text-xl font-black">
                {isDeath
                  ? `故 ${report.trade.symbol} 거래 사망진단서`
                  : `${report.trade.symbol} 거래 생존보고서`}
              </h2>
              <p className="text-white/40 text-xs mt-1.5">
                {createdDate} 발행 · 故래소 거래 분석 시스템
              </p>
            </div>

            <div className="p-6">
              {/* 수익률 / 보유시간 */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  className="p-4 text-center"
                  style={{ background: `${kindColor}18`, border: `1px solid ${kindColor}20` }}
                >
                  <p
                    className="text-[10px] font-bold mb-1 uppercase tracking-wide"
                    style={{ color: kindColor }}
                  >
                    최종 수익률
                  </p>
                  <p className="text-2xl font-black" style={{ color: kindColor }}>
                    {formatPct(report.trade.pnlPct)}
                  </p>
                </div>
                <div className="bg-muted/40 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">
                    보유 시간
                  </p>
                  <p className="text-base font-bold text-foreground">
                    {holdLabel(report.trade.holdDurationMin)}
                  </p>
                </div>
              </div>

              {/* 분석 본문 */}
              {report.body && (
                <>
                  <OrnamentalDivider color={kindColor} />
                  <p className="text-sm text-foreground leading-relaxed my-4">{report.body}</p>
                </>
              )}

              {/* 원인 목록 */}
              {causes.length > 0 && (
                <>
                  <OrnamentalDivider color={kindColor} />
                  <div className="mb-5">
                    <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      {isDeath
                        ? <AlertTriangle size={13} style={{ color: kindColor }} />
                        : <CheckCircle size={13} style={{ color: kindColor }} />}
                      {isDeath ? "사망 원인" : "생존 요인"}
                    </h4>
                    <div className="space-y-2">
                      {causes.map((cause, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-4 py-2.5"
                          style={{ background: `${kindColor}10`, border: `1px solid ${kindColor}10` }}
                        >
                          <span
                            className="w-5 h-5 flex items-center justify-center text-white text-[10px] font-black shrink-0"
                            style={{ background: kindColor }}
                          >
                            {isDeath ? i + 1 : "✓"}
                          </span>
                          <span className="text-sm text-foreground">{cause}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 위반 / 준수 조항 */}
              {violatedClauses.length > 0 && (
                <>
                  <OrnamentalDivider color="#C9A227" />
                  <div className="bg-[#FDF8EC] border border-[#C9A227]/35 px-4 py-3.5 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={12} className="text-[#C9A227]" />
                      <span className="text-[11px] font-bold text-[#7A5F0E] tracking-wide">
                        {isDeath ? "위반한 유언장 조항" : "준수한 유언장 조항"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {violatedClauses.map((c) => (
                        <p key={c.id} className="text-sm text-foreground font-semibold">
                          &ldquo;{c.displayText}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 조항 제안 */}
              {report.suggestions.length > 0 && (
                <div className="space-y-2 mb-5">
                  <p className="text-[9px] font-bold text-muted-foreground tracking-[0.2em] uppercase mb-2">
                    신규 유언장 조항 제안
                  </p>
                  {report.suggestions.map((s) => (
                    <div key={s.id} className="bg-muted/30 border border-border px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#C9A227]/10 text-[#7A5F0E] px-2 py-0.5 font-bold">
                            분석 제안
                          </span>
                          <span className="text-[9px] text-muted-foreground">{s.ruleType}</span>
                        </div>
                        <SuggestionActions suggestion={{ id: s.id, status: s.status }} />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        &ldquo;{s.displayText}&rdquo;
                      </p>
                      {s.rationale && (
                        <p className="text-xs text-muted-foreground mt-1.5">{s.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <OrnamentalDivider color={kindColor} />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">
                    발행인
                  </p>
                  <p className="text-xs font-semibold text-foreground">故래소 거래 분석 시스템</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{createdDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">
                    확인자 서명
                  </p>
                  <div className="w-36 border-b border-foreground/20 mb-1" />
                  <p className="text-[9px] text-muted-foreground">데모 투자자 (본인)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 목록 뷰 ──────────────────────────────────────────────────
  const reports = await prisma.report.findMany({
    where: { trade: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      trade: {
        select: { symbol: true, market: true, pnlPct: true, holdDurationMin: true },
      },
    },
  });

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">거래 보고서</h1>
          <p className="text-sm text-muted-foreground mt-1">
            청산된 거래의 사망진단서·생존보고서 목록입니다.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-card border border-border p-10 text-center">
            <FileText size={28} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              아직 발급된 보고서가 없습니다.<br />
              거래를 청산하면 자동으로 보고서가 생성됩니다.
            </p>
            <Link
              href="/history"
              className="mt-4 inline-block text-xs font-bold text-foreground hover:underline underline-offset-2"
            >
              거래 기록에서 발급하기 →
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["종목", "구분", "수익률", "보유시간", "발급일", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[9px] font-bold text-muted-foreground tracking-widest uppercase ${
                        ["수익률", "보유시간", "발급일", ""].includes(h) ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const isDeath = r.kind === "DEATH";
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-bold text-foreground">
                        {r.trade.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[9px] font-black tracking-wider px-2 py-0.5 ${
                            isDeath
                              ? "bg-[#FAEAEA] text-[#B83535]"
                              : "bg-[#EBF7F3] text-[#3D9E72]"
                          }`}
                        >
                          {isDeath ? "사망진단서" : "생존보고서"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-bold text-right ${
                          isDeath ? "text-[#B83535]" : "text-[#3D9E72]"
                        }`}
                      >
                        {formatPct(r.trade.pnlPct)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-right">
                        {holdLabel(r.trade.holdDurationMin)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-right">
                        {r.createdAt.toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reports?id=${r.id}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
