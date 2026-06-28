import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { OrnamentalDivider, CertSeal } from "@/components/cert-ui";
import { MY_WILL_DATA } from "@/lib/mock-data";

export default function WillPage() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">나의 투자 유언장</h2>
            <p className="text-sm text-muted-foreground mt-1">총 5개 조항 · 마지막 업데이트: 2026.06.28</p>
          </div>
          <button className="flex items-center gap-2 bg-[#FDF8EC] border border-[#C9A227]/40 text-[#7A5F0E] px-4 py-2 text-sm font-bold hover:bg-[#F5EDD0] transition-colors">
            <Plus size={13} />
            새 조항 추가
          </button>
        </div>

        <div className="border border-[#C9A227]/40 p-0.5">
          <div className="border border-[#C9A227]/20 bg-[#FDFAF6]">
            <div className="relative px-10 pt-8 pb-6 text-center" style={{ borderBottom: "2px double rgba(201,162,39,0.2)" }}>
              <div className="absolute top-5 right-7">
                <CertSeal color="#C9A227" line1="투자자" line2="유언장" rotate={-8} />
              </div>
              <p className="text-[9px] font-black tracking-[0.4em] text-[#C9A227] uppercase mb-3">투자자 공식 유언장</p>
              <h2 className="text-2xl font-black text-foreground tracking-[0.15em] mb-1">투 자 유 언 장</h2>
              <OrnamentalDivider />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                나, 김주식은 투자자로서 아래와 같은 원칙을 스스로에게 선언하며,<br />
                이를 매 거래 전 유언장으로써 읽고 준수할 것을 엄숙히 서약합니다.
              </p>
              <div className="mt-3 text-[10px] text-muted-foreground">
                작성일: 2026년 6월 28일 &nbsp;·&nbsp; 서약자: 김주식
              </div>
            </div>

            <div className="px-10 py-4">
              {MY_WILL_DATA.map(({ id, art, text, source, violations, lastDate }, i) => (
                <div key={id}>
                  <div className="flex items-start gap-5 py-4">
                    <span className="text-[11px] font-black text-[#C9A227] tracking-wider w-12 shrink-0 pt-0.5">{art}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed mb-1.5">{text}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-[9px] text-muted-foreground tracking-wide">출처: {source}</span>
                        <span className={`text-[9px] font-black tracking-wider ${violations > 0 ? "text-[#B83535]" : "text-[#3D9E72]"}`}>
                          {violations > 0 ? `위반 ${violations}회` : "위반 없음"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">마지막 위반: {lastDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted"><Edit2 size={12} /></button>
                      <button className="p-2 text-muted-foreground hover:text-[#B83535] transition-colors hover:bg-muted"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {i < MY_WILL_DATA.length - 1 && <div className="border-b border-dashed border-foreground/10" />}
                </div>
              ))}
            </div>

            <div className="px-10 py-6" style={{ borderTop: "2px double rgba(201,162,39,0.2)" }}>
              <OrnamentalDivider />
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">서약자 서명</p>
                  <div className="w-40 border-b border-foreground/20 mb-1" />
                  <p className="text-[9px] text-muted-foreground">김주식 · 2026년 6월 28일</p>
                </div>
                <p className="text-[9px] text-muted-foreground/50 text-right max-w-xs leading-relaxed">
                  이 유언장은 주문 전마다 자동으로 낭독됩니다.<br />故래소 거래 분석 시스템 보관
                </p>
              </div>
              <div className="mt-5 flex justify-end">
                <Link href="/dashboard" className="text-xs font-bold text-[#7A5F0E] hover:underline underline-offset-2 tracking-wide">
                  홈으로 돌아가기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
