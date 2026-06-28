import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-12 py-4 border-b border-border">
        <Link href="/" className="text-lg font-black text-foreground tracking-tight">故래소</Link>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">증권사 계좌 연동</span>
      </header>

      <main className="flex-1 flex items-center justify-center py-16 px-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-1.5">증권사 계좌 연동</h2>
          <p className="text-sm text-muted-foreground mb-8">거래하기 전에 증권사 API를 연결해 주세요.</p>

          <div className="bg-card border border-border p-4 mb-4 flex items-center justify-between">
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "예수금 잔고", value: "₩4,823,400" },
              { label: "보유 종목 수", value: "3 종목" },
              { label: "API 권한", value: "조회 / 주문" },
              { label: "연동 일시", value: "2026.06.28 09:12" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border p-4">
                <p className="text-[10px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
                <p className="text-sm font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#FDF8EC] border border-[#C9A227]/30 px-4 py-3 mb-6 flex items-start gap-3">
            <Shield size={13} className="text-[#C9A227] mt-0.5 shrink-0" />
            <p className="text-xs text-[#7A5F0E] leading-relaxed">
              실제 주문 전에는 반드시 유언장 검사를 거칩니다. 故래소는 귀하의 투자 결정에 개입하지 않으며, 과거 거래 패턴을 분석해 경고만 제공합니다.
            </p>
          </div>

          <Link
            href="/will/setup"
            className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            계좌 연동 완료
          </Link>
        </div>
      </main>
    </div>
  );
}
