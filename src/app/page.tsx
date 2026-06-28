import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrnamentalDivider } from "@/components/cert-ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-12 py-4 border-b border-border">
        <span className="text-xl font-black text-foreground tracking-tight">故래소</span>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          로그인
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-3xl border border-foreground/12 p-0.5">
          <div className="border border-foreground/6 p-10 text-center bg-card">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(to right, transparent, rgba(201,162,39,0.4))" }} />
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#C9A227] uppercase">공식 서비스 안내</span>
              <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(to left, transparent, rgba(201,162,39,0.4))" }} />
            </div>

            <h1 className="text-7xl font-black text-foreground mb-3 tracking-tighter">故래소</h1>
            <OrnamentalDivider />
            <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed mb-10">
              죽은 거래가 남긴 유언장을 다음 주문 전에 읽어드립니다.
            </p>

            <div className="grid grid-cols-3 gap-0 mb-10 border border-border">
              {[
                { num: "一", title: "주문 전 유언장 검사", desc: "과거 손실 거래가 남긴 교훈을 주문 직전에 자동으로 낭독합니다." },
                { num: "二", title: "사망진단서 / 생존보고서", desc: "거래 종료 후 원인을 분석하고 공식 문서로 발행합니다." },
                { num: "三", title: "투자 유언장 업데이트", desc: "거래 경험을 바탕으로 나만의 투자 원칙을 쌓아갑니다." },
              ].map(({ num, title, desc }, i) => (
                <div key={num} className={`p-6 text-left ${i < 2 ? "border-r border-border" : ""}`}>
                  <p className="text-2xl font-black text-[#C9A227] mb-3 opacity-60">{num}</p>
                  <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <Link
              href="/connect"
              className="bg-foreground text-background px-8 py-3.5 font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              지갑 연동하기
              <ChevronRight size={15} />
            </Link>

            <OrnamentalDivider />
            <p className="text-[10px] text-muted-foreground tracking-wide">
              본 서비스는 투자 추천 서비스가 아닙니다 · 모든 투자 판단은 본인의 책임입니다
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
