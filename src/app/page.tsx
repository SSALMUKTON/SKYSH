import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            故래소
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            거래를 부검하다
          </h1>
          <p className="text-lg text-muted-foreground">
            가장 좋은 투자 조언자는 AI가 아니라, 감정이 없을 때의 나일 수 있습니다.
            주문 직전 투자 유언장을 낭독하고, 거래가 끝나면 사망진단서·생존보고서를
            발급합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/trades"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            대시보드 열기
          </Link>
          <a
            href="https://github.com/SSALMUKTON/SKYSH"
            className="inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            저장소
          </a>
        </div>

        <div className="rounded-lg border bg-card p-5 text-sm text-card-foreground">
          <p className="font-medium">핵심 피드백 루프</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>유언장 작성 — 평정심 있을 때 나만의 투자 원칙</li>
            <li>주문 전 검사 — 원칙 위반 시 낭독 모달·강행 사유</li>
            <li>거래 추적 — 매수~매도 묶음, 청산 시 손익 확정</li>
            <li>거래 후 복기 — 사망/생존 보고서 + 새 조항 제안</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
