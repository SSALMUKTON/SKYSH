import Link from "next/link";
import { Shield, RefreshCw, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-10 max-w-2xl">
      <h1 className="text-2xl font-black text-foreground mb-1">설정</h1>
      <p className="text-sm text-muted-foreground mb-10">계좌 연동 및 유언장 관리</p>

      {/* 증권사 연동 */}
      <section className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">증권사 계좌</p>
        <div className="border border-border bg-card p-4 flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0052C8] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black">KIS</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">한국투자증권 Open API</p>
              <p className="text-xs text-muted-foreground">계좌번호 ****-****-1234</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3D9E72] bg-[#EBF7F3] px-2.5 py-1">
            <span className="w-1.5 h-1.5 bg-[#3D9E72] block" />
            연결됨
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "예수금 잔고", value: "₩4,823,400" },
            { label: "보유 종목 수", value: "3 종목" },
            { label: "API 권한", value: "조회 / 주문" },
            { label: "연동 일시", value: "2026.06.28 09:12" },
          ].map(({ label, value }) => (
            <div key={label} className="border border-border bg-card p-4">
              <p className="text-[10px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
              <p className="text-sm font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 유언장 */}
      <section className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">투자 유언장</p>
        <Link
          href="/will/setup"
          className="flex items-center justify-between border border-border bg-card px-5 py-4 hover:border-[#C9A227]/50 hover:bg-[#FDF8EC] transition-all group"
        >
          <div className="flex items-center gap-3">
            <RefreshCw size={14} className="text-muted-foreground group-hover:text-[#C9A227] transition-colors" />
            <div>
              <p className="text-sm font-semibold text-foreground">유언장 재설정</p>
              <p className="text-xs text-muted-foreground mt-0.5">진단을 다시 받고 조항을 교체합니다</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      </section>

      {/* 안내 */}
      <div className="bg-[#FDF8EC] border border-[#C9A227]/30 px-4 py-3 flex items-start gap-3">
        <Shield size={13} className="text-[#C9A227] mt-0.5 shrink-0" />
        <p className="text-xs text-[#7A5F0E] leading-relaxed">
          실제 주문 전에는 반드시 유언장 검사를 거칩니다. 故래소는 귀하의 투자 결정에 개입하지 않으며, 과거 거래 패턴을 분석해 경고만 제공합니다.
        </p>
      </div>
    </div>
  );
}
