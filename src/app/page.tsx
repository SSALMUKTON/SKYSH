import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            SKYSH
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            투자 유언장
          </h1>
          <p className="text-lg text-muted-foreground">
            냉정했던 내가 흥분한 나의 주문을 통과시킨다. 미리 적어둔 유언 조항이
            주문을 게이팅하고, 거래가 끝나면 사망·생존 보고서로 복기합니다.
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
          <p className="font-medium">핵심 흐름</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>유언 조항 작성 — 자연어 문구 + 실행 룰</li>
            <li>주문 precheck — 조항에 어긋나면 경고/강행 사유 기록</li>
            <li>거래(매수~매도) 추적 후 청산</li>
            <li>Gemini 가 사망/생존 보고서와 새 조항 제안</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
