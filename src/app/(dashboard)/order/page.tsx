export default function OrderPage() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">주문</h1>
        <p className="text-sm text-muted-foreground">
          주문 입력 → precheck 경고 → 강행 사유 입력 흐름. — 담당 P2
        </p>
      </header>
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">TODO (P2)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>주문 폼: 종목/매수·매도/지정가·시장가/수량/가격</li>
          <li>제출 시 POST /api/order/precheck → 위반이면 낭독 모달</li>
          <li>강행 시 forceReason 입력 후 POST /api/order/execute</li>
        </ul>
      </div>
    </section>
  );
}
