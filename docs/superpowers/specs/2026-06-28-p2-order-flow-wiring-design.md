# P2 — 주문 플로 배선 설계 (order flow wiring)

**날짜:** 2026-06-28
**담당:** P2 (프론트)
**범위:** 주문 입력 → precheck → 낭독 모달 → 강행 → execute 까지의 실동작 배선

---

## 목표

현재 목업 상태인 주문 화면(`order/page.tsx`)과 낭독 모달(`will-precheck-modal.tsx`)을
P1/P4가 정의한 API 계약에 맞춰 **실제 호출**하도록 배선한다. 단, 의존 API(`precheck`,
`execute`, `market/quote`)가 아직 stub(501)이므로 **실패 시 클라이언트 목 데이터로 폴백**해
지금 당장 데모 가능하게 하고, 팀원이 API를 끝내면 코드 수정 없이 자동 전환되게 한다.

## 비범위 (이번 단계 아님)

- 보고서 화면(reports), 보유/매도 화면(trades) — 다음 단계
- 실제 broker 키 연동 로직 (P1 담당). Authorization 헤더는 localStorage 에 있으면 실어 보내고 없으면 생략.

---

## 아키텍처: 얇은 API 클라이언트 한 겹

페이지가 `fetch`를 직접 호출하지 않고 **`src/lib/api-client.ts`** 래퍼를 거친다.
각 함수는 "진짜 API 호출 → `res.ok` 아니거나(=501 stub) 네트워크 오류면 목 데이터 반환".
폴백 분기가 한 곳에 모이므로 팀원이 API를 끝내면 자동으로 실 API 경로로 전환된다.

```
getQuote(market, symbol): Promise<Quote>
  → GET /api/market/quote?market=&symbol=  실패 시 MOCK_QUOTE

precheck(draft: OrderDraft): Promise<PrecheckResult>
  → POST /api/order/precheck  실패 시 mockPrecheck(draft) (client-side 룰체크)

execute(draft, forceReason?, violations?): Promise<ExecuteResult>
  → POST /api/order/execute  실패 시 mock ack { orderId, brokerOrderId, status:"PENDING" }
```

- 타입은 기존 계약 그대로 사용: `Quote`(broker/types), `OrderDraft`/`PrecheckResult`/`Violation`(rules/types).
- `ExecuteResult` 타입은 라우트 가이드 주석 기준으로 `{ orderId, brokerOrderId, status, tradeId? }` 로 클라이언트에 정의.
- 폴백이 발동했는지 호출부가 알 수 있도록 각 함수는 `{ data, mocked: boolean }` 형태로 반환(개발용 배지 표시에 사용).

## 폴백 mock 룰체크 (데모 핵심)

`mockPrecheck(draft)` 는 P4 가이드(engine.ts 주석)와 동일 로직을 client-side 로 구현해
**폼 입력에 반응**한다:

- `NO_STOP_LOSS`: `side=BUY` 인데 `stopPrice` 미입력 → 위반(severity `block`, actions `[set_stop_loss, force]`)
- `CHASE_SURGE`: mock 시세 `changePct >= 15` 이고 `orderType=MARKET` → 위반(severity `block`, actions `[postpone, switch_limit, reduce_amount, force]`)

→ 사용자가 손절가를 채우거나 지정가로 바꾸면 해당 위반이 사라진다(데모 클라이맥스).

`MOCK_QUOTE`: TSLA(`market="US"`), 프리마켓, `changePct` 를 CHASE_SURGE 유발 값으로 설정한 결정론적 시세.

## 데이터 흐름 (order/page.tsx)

1. 로드 → `getQuote("US","TSLA")` → 현재가·등락률·세션 표시 (로딩/에러 상태 포함)
2. 폼: 수량 / 시장가·지정가 / 손절가 / 거래이유
3. "유언장 검사" 클릭 → `precheck(draft)` → `violations`
4. `violations.length>0` → 낭독 모달에 실제 데이터 전달 / 아니면 바로 확인 화면
5. 모달 선택지 동작:
   - `postpone` → 모달 닫기
   - `switch_limit` → `orderType="LIMIT"` 로 변경 후 닫기(재검사 유도)
   - `reduce_amount` → 수량 절반으로 감소 후 닫기
   - `set_stop_loss` → 모달 닫고 손절가 입력 포커스
   - `force` → 강행 사유 입력칸 노출 → 사유 입력 후 `execute(draft, reason, violations)` → 확인 화면
6. 위반 없으면 "유언장 검사 통과" 후 `execute(draft)` → 확인 화면

## 모달 일반화 (will-precheck-modal.tsx)

하드코딩된 "제2조"를 props 로 대체:

```ts
interface Props {
  violations: Violation[];
  quote: Quote;
  draft: OrderDraft;
  onAction: (action: SuggestedAction) => void; // postpone/switch_limit/reduce_amount/set_stop_loss
  onForce: (reason: string) => void;            // 강행
  onClose: () => void;
}
```

- 위반 문구(`violation.message`)와 현재 상황(quote 기반: 세션/등락률/주문방식/손절유무)을 렌더.
- `actions` 배열에 따라 버튼 노출. `force` 선택 시 사유 입력 textarea 노출 → 입력해야 `onForce` 활성.

## 에러/로딩 정책

- quote 로딩 중: 가격 영역 스켈레톤. 로드 실패(폴백도 실패할 일은 없지만): 안내 문구.
- precheck/execute 진행 중: 버튼 disabled + 스피너.
- 폴백 동작 시 개발용 작은 배지("mock") 표시 — 실 API 전환 여부를 눈으로 확인.

## 테스트/검증

- `tsc` 타입 통과 (계약 타입 사용으로 팀원 코드와 호환 보장).
- dev 서버에서 수동 플로 검증: 손절 비움→모달 위반 표시→손절 작성 선택→재검사 시 통과→execute→확인 화면.
- API 가 stub 인 동안 폴백으로 전 구간 동작함을 확인.
