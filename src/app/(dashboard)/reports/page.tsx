import Link from "next/link";
import { AlertTriangle, CheckCircle, BookOpen } from "lucide-react";
import { OrnamentalDivider, CertStamp, CertSeal } from "@/components/cert-ui";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "death" } = await searchParams;

  if (kind === "survival") {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border-2 border-[#3D9E72]/25 overflow-hidden relative">
            <div className="absolute top-5 right-5 flex flex-col items-end gap-2 pointer-events-none z-10">
              <CertStamp color="#3D9E72" text="생존확인" sub="CERTIFIED" />
              <CertSeal color="#3D9E72" line1="故래소" line2="분석인증" rotate={9} />
            </div>
            <div className="bg-[#1B1B26] px-6 py-5">
              <p className="text-[#3D9E72] text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">Trade Survival Report</p>
              <h2 className="text-white text-xl font-black">AAPL 거래 생존보고서</h2>
              <p className="text-white/40 text-xs mt-1.5">2026년 6월 27일 발행 · 故래소 거래 분석 시스템</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#EBF7F3] border border-[#3D9E72]/20 p-4 text-center">
                  <p className="text-[10px] text-[#3D9E72] font-bold mb-1 uppercase tracking-wide">최종 수익률</p>
                  <p className="text-2xl font-black text-[#3D9E72]">+3.1%</p>
                </div>
                <div className="bg-muted/40 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">보유 시간</p>
                  <p className="text-base font-bold text-foreground">1일 4시간</p>
                </div>
                <div className="bg-muted/40 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">실현 수익</p>
                  <p className="text-base font-bold text-[#3D9E72]">+₩23,820</p>
                </div>
              </div>
              <OrnamentalDivider color="#3D9E72" />
              <div className="mb-5">
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle size={13} className="text-[#3D9E72]" />
                  생존 요인
                </h4>
                <div className="space-y-2">
                  {["지정가로 진입하여 갭 리스크 최소화", "목표 수익률 +3%를 사전에 설정", "목표 도달 후 계획대로 매도 실행"].map((factor, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#EBF7F3] border border-[#3D9E72]/10 px-4 py-2.5">
                      <span className="w-5 h-5 bg-[#3D9E72] flex items-center justify-center shrink-0">
                        <CheckCircle size={11} className="text-white" />
                      </span>
                      <span className="text-sm text-foreground">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
              <OrnamentalDivider color="#C9A227" />
              <div className="bg-[#FDF8EC] border border-[#C9A227]/35 px-4 py-3.5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={12} className="text-[#C9A227]" />
                  <span className="text-[11px] font-bold text-[#7A5F0E] tracking-wide">준수한 유언장 조항</span>
                </div>
                <p className="text-sm text-foreground font-semibold">&ldquo;제4조. 목표 수익률을 정하고 거래한다.&rdquo;</p>
              </div>
              <div className="bg-muted/30 border border-border px-4 py-3.5 mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-foreground">신규 유언장 조항 제안</span>
                  <span className="text-[10px] bg-[#C9A227]/10 text-[#7A5F0E] px-2 py-0.5 font-bold">분석 제안</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">&ldquo;나는 수익 구간에서도 목표가에 도달하면 일부라도 실현한다.&rdquo;</p>
              </div>
              <OrnamentalDivider color="#3D9E72" />
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">발행인</p>
                  <p className="text-xs font-semibold text-foreground">故래소 거래 분석 시스템</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">2026년 6월 27일</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">확인자 서명</p>
                  <div className="w-36 border-b border-foreground/20 mb-1" />
                  <p className="text-[9px] text-muted-foreground">김주식 (본인)</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/will" className="py-2.5 bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center">유언장에 추가</Link>
                <button className="py-2.5 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">수정하기</button>
                <button className="py-2.5 border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">버리기</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border-2 border-[#B83535]/25 overflow-hidden relative">
          <div className="absolute top-5 right-5 flex flex-col items-end gap-2 pointer-events-none z-10">
            <CertStamp color="#B83535" text="사망확인" sub="CONFIRMED" />
            <CertSeal color="#B83535" line1="故래소" line2="분석인증" rotate={9} />
          </div>
          <div className="bg-[#1B1B26] px-6 py-5">
            <p className="text-[#B83535] text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">Trade Death Certificate</p>
            <h2 className="text-white text-xl font-black">故 TSLA 거래 사망진단서</h2>
            <p className="text-white/40 text-xs mt-1.5">2026년 6월 28일 발행 · 故래소 거래 분석 시스템</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-4 text-center">
                <p className="text-[10px] text-[#B83535] font-bold mb-1 uppercase tracking-wide">최종 수익률</p>
                <p className="text-2xl font-black text-[#B83535]">-4.3%</p>
              </div>
              <div className="bg-muted/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">보유 시간</p>
                <p className="text-base font-bold text-foreground">2시간 12분</p>
              </div>
              <div className="bg-muted/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">실현 손익</p>
                <p className="text-base font-bold text-[#B83535]">-₩41,700</p>
              </div>
            </div>
            <OrnamentalDivider color="#B83535" />
            <div className="mb-5">
              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle size={13} className="text-[#B83535]" />
                사망 원인
              </h4>
              <div className="space-y-2">
                {["프리마켓 갭상 직후 시장가 매수", "손절 기준 없이 진입", "가격 급등 후 감정적 반복 조회"].map((cause, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#FAEAEA] border border-[#B83535]/10 px-4 py-2.5">
                    <span className="w-5 h-5 bg-[#B83535] flex items-center justify-center text-white text-[10px] font-black shrink-0">{i + 1}</span>
                    <span className="text-sm text-foreground">{cause}</span>
                  </div>
                ))}
              </div>
            </div>
            <OrnamentalDivider color="#C9A227" />
            <div className="bg-[#FDF8EC] border border-[#C9A227]/35 px-4 py-3.5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={12} className="text-[#C9A227]" />
                <span className="text-[11px] font-bold text-[#7A5F0E] tracking-wide">위반한 유언장 조항</span>
              </div>
              <p className="text-sm text-foreground font-semibold">&ldquo;제2조. 프리마켓 갭상 직후 매수 금지&rdquo;</p>
            </div>
            <div className="bg-muted/30 border border-border px-4 py-3.5 mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">신규 유언장 조항 제안</span>
                <span className="text-[10px] bg-[#C9A227]/10 text-[#7A5F0E] px-2 py-0.5 font-bold">분석 제안</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">&ldquo;나는 프리마켓에서 전일 종가 대비 +5% 이상 오른 종목을 시장가로 매수하지 않는다.&rdquo;</p>
            </div>
            <OrnamentalDivider color="#B83535" />
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">발행인</p>
                <p className="text-xs font-semibold text-foreground">故래소 거래 분석 시스템</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">2026년 6월 28일</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">확인자 서명</p>
                <div className="w-36 border-b border-foreground/20 mb-1" />
                <p className="text-[9px] text-muted-foreground">김주식 (본인)</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/will" className="py-2.5 bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center">유언장에 추가</Link>
              <button className="py-2.5 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">수정하기</button>
              <button className="py-2.5 border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">버리기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
