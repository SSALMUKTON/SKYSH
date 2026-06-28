import Link from "next/link";
import { OrnamentalDivider } from "@/components/cert-ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="border border-[#C9A227]/40 px-10 py-10">
          <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-4">사망 진단서</p>
          <p className="text-6xl font-black text-foreground mb-2">404</p>
          <h1 className="text-lg font-black text-foreground tracking-tight mb-3">페이지를 찾을 수 없음</h1>
          <OrnamentalDivider />
          <p className="text-xs text-muted-foreground mt-3 mb-6 leading-relaxed">
            요청하신 페이지는 존재하지 않거나<br />이미 청산된 경로입니다.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-foreground text-background px-6 py-2.5 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
