export default function ReportsPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">보고서</h1>
        <p className="text-sm text-muted-foreground">
          청산된 거래의 사망/생존 보고서와 조항 제안. — 담당 P2(화면) · P3(생성)
        </p>
      </header>
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">TODO</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>P2: 보고서 카드(DEATH/SURVIVAL 구분) + 본문/인사이트 표시</li>
          <li>P2: 제안된 조항을 &quot;유언장에 추가&quot; 버튼으로 채택</li>
          <li>P3: generateTradeReport 구현(gemini/report.ts) + POST /api/reports</li>
        </ul>
      </div>
    </section>
  );
}
