# 故래소 (SKYSH 2026)

> "가장 좋은 투자 조언자는 AI가 아니라, 감정이 없을 때의 나일 수 있습니다."

증권사 API 주문 **직전**에 사용자의 투자 유언장을 낭독하고, 거래가 끝난 뒤 결과를
다시 유언장 조항으로 남기는 **거래 실행형 투자 복기 서비스**.
(`SKYSH`는 해커톤/저장소 이름, 제품명은 **故래소**)

이 저장소는 **개발 시작용 골격(스캐폴드)** 입니다. 도메인 인터페이스/스키마는 잡혀
있고 **실제 로직은 담당자가 채웁니다.** `not implemented` / `TODO(P*)` 를 찾아 자신의
영역부터 구현하세요. 상세 기획은 [`spec.md`](spec.md), 디자인은 [`DESIGN.md`](DESIGN.md)
· [`design-system.html`](design-system.html) · [`trading.html`](trading.html) 참고.

---

## 빠른 시작

```bash
npm install                 # postinstall 이 prisma client 자동 생성
cp .env.example .env        # 값 채우기 (Windows: copy .env.example .env)
npm run db:push             # Supabase 연결 후 스키마 반영
npm run db:seed             # (선택) 데모 데이터
npm run dev                 # http://localhost:3000
```

> KIS/Upbit/Gemini 키가 없어도 됩니다. `BROKER_PROVIDER=mock`(기본값)으로 전 구간이 동작합니다.

---

## 기술 스택

| 레이어 | 선택 |
| --- | --- |
| 프론트 + BFF | **Next.js 16 (App Router) + Route Handlers** (별도 서버 X) |
| 스타일 | Tailwind v4 + shadcn/ui |
| DB/ORM | Supabase(Postgres) + Prisma 6 |
| 브로커 | MockBroker(MVP) · 한국투자증권 KIS(KR/US) · Upbit(COIN) |
| LLM | Google Gemini (보고서 서술 + 조항 제안) |

> 스택 메모: 팀 `spec.md` 초안엔 React(Vite)+NestJS 표기가 있으나, 팀 결정으로
> **Next.js 풀스택**(이미지의 "별도 서버 불필요")으로 확정. spec.md 의 제품/모델/
> 플로우 내용은 이 골격에 반영됨.

## 🔐 보안 모델 (중요 — spec.md)

증권사/거래소 **API Key 는 서버 DB·env 에 저장하지 않습니다.**
- 키는 **클라이언트 localStorage** 에 보관
- 요청 시 **Authorization 헤더**로 전달
- 서버(Route Handler)는 **중계만** (키 로깅 금지)

→ 그래서 Prisma 스키마에 키 저장 모델이 없고, `.env.example` 에도 KIS/Upbit 키가 없습니다.

---

## 담당자 진입점 (P1~P4)

| 담당 | 영역 | 시작 파일 |
| --- | --- | --- |
| **P1** | 브로커 / 주문 실행 / Trade 생명주기 / 보고서 트리거 / 메인 통합 | `src/lib/broker/**`, `src/app/api/order/**`, `src/app/api/market/quote/route.ts`, `src/app/api/trades/route.ts`, `prisma/schema.prisma` |
| **P2** | 프론트 3화면 (주문·낭독모달·보고서) + 보유거래/매도 | `src/app/(dashboard)/**` (+ `design-system.html` 참고) |
| **P3** | Gemini 사망진단서/생존보고서 + 조항 제안 | `src/lib/gemini/report.ts`, `src/app/api/reports/route.ts` |
| **P4** | 규칙엔진 `checkOrder` + 조항 시드/CRUD/제안 적용 | `src/lib/rules/**`, `src/app/api/clauses/route.ts`, `prisma/seed.ts` |

**계약선**: `src/lib/broker/types.ts`(Broker), `src/lib/rules/types.ts`(PrecheckResult),
`src/lib/gemini/report.ts`(GeneratedReport). 시그니처 변경 시 팀에 공유하세요.

---

## 핵심 흐름

```
유언장 작성(P4)  →  주문 입력(P2)  →  precheck(P4 checkOrder · P1 배선)
   ↓ 위반?                                    ↓
낭독 모달 → 강행 사유 ──────────►  주문 실행(P1) → 체결 → Trade(OPEN)
                                               ↓ 매도/청산
                                          Trade(CLOSED) + 손익 → 보고서(P3)
                                               ↓
                              사망진단서/생존보고서 + 조항 제안(P3) → 유언장 갱신(P4)
```

## 데이터 모델 (요약)

- **User** — 사용자 (증권사 키는 저장 안 함)
- **Trade** — 매수~매도 묶음 (`market`, `OPEN`/`CLOSED`, `pnlPct`, `holdDurationMin`)
- **Order** — 개별 주문 (`stopPrice`, `forceReason`, `willViolations`, `status`)
- **Clause** — 유언 조항 (`ruleType`+`params` & `displayText`, `violationCount`)
- **Report** — 사망/생존 보고서 (`DEATH`/`SURVIVAL`, `causes`, `rawAiResponse`)
- **ClauseSuggestion** — 보고서의 조항 제안 (`PENDING`/`APPROVED`/`REJECTED`)

## API 라우트

| 메서드 | 경로 | 설명 | 담당 |
| --- | --- | --- | --- |
| POST | `/api/order/precheck` | 주문 게이팅 검사 | P1+P4 |
| POST | `/api/order/execute` | 주문 실행 | P1 |
| GET | `/api/market/quote` | 현재가/등락률 조회(중계) | P1 |
| GET/POST | `/api/trades` | 거래 조회/생성 | P1 |
| GET/POST | `/api/clauses` | 유언 조항 CRUD | P4 |
| GET/POST | `/api/reports` | 보고서 조회/생성 | P3 |

> 현재 모든 라우트는 `501 not implemented` 스텁입니다. 각 핸들러 상단 주석의 *구현 가이드*를 따르세요.

---

## 협업 규칙

- 브랜치: `feat/<담당>-<내용>` (예: `feat/p1-mock-broker`) → PR.
- `npm run lint` / `npm run build` 통과 후 PR.
- shadcn 컴포넌트는 필요할 때 `npx shadcn@latest add <name>`.
- 환경변수/스키마 변경 시 `.env.example` / 팀 공유 갱신.
