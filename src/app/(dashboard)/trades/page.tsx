export default function TradesPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">거래</h1>
        <p className="text-sm text-muted-foreground">
          매수~매도를 하나로 묶은 거래(Trade) 목록. — 담당 P2
        </p>
      </header>
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">TODO (P2)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>GET /api/trades 로 목록 조회 후 OPEN/CLOSED 구분 표시</li>
          <li>거래 클릭 → 주문 내역 + 보고서로 이동</li>
          <li>shadcn 컴포넌트는 `npx shadcn@latest add table card badge` 로 추가</li>
        </ul>
      </div>
    </section>
  );
}
