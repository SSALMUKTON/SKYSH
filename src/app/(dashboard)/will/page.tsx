export default function WillPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">유언장</h1>
        <p className="text-sm text-muted-foreground">
          투자 유언 조항: 자연어 문구 + 실행 룰. — 담당 P2(화면) · P4(룰/CRUD)
        </p>
      </header>
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">TODO</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>P2: 조항 목록/작성 폼 (GET·POST /api/will)</li>
          <li>P4: ruleType 별 params 스키마 + 검사 로직(engine.ts)</li>
          <li>보고서가 제안한 조항(sourceTradeId) 강조 표시</li>
        </ul>
      </div>
    </section>
  );
}
