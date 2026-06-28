# SKYSH — 투자 유언장

> 흥분한 내가 아니라, **냉정했던 내가** 주문을 통과시킨다.
> 미리 적어둔 **유언 조항**이 주문을 게이팅하고, 거래가 끝나면 **사망·생존 보고서**로 복기한다.

규율 기반 주식 거래 서비스 MVP. 이 저장소는 **개발 시작용 골격(스캐폴드)** 이며, 각 도메인의
인터페이스/스키마는 잡혀 있고 **실제 로직은 담당자가 채웁니다.** `not implemented` / `TODO` 를 찾아
자신의 영역부터 구현하세요.

---

## 빠른 시작

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 — 예시를 복사해 값 채우기
cp .env.example .env        # Windows PowerShell:  copy .env.example .env

# 3) DB 스키마 반영 (Supabase Postgres 연결 후)
npm run db:push             # 빠른 동기화  (정식 마이그레이션은 npm run db:migrate)
npm run db:seed             # (선택) 데모 데이터

# 4) 개발 서버
npm run dev                 # http://localhost:3000
```

> KIS / Gemini 키가 아직 없어도 됩니다. `BROKER_PROVIDER=mock`(기본값)으로 Mock broker가 동작합니다.

---

## 기술 스택

| 레이어 | 선택 |
| --- | --- |
| 프론트 | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui |
| BFF/백엔드 | Next.js Route Handlers (`src/app/api/**`) |
| DB/ORM | Supabase(Postgres) + Prisma |
| 증권 연동 | 한국투자증권 KIS Developers (REST, OAuth 토큰) |
| LLM | Google Gemini (보고서 서술 + 조항 제안) |

자세한 기획 자료: [`docs/planning/`](docs/planning) (스택·데이터모델·역할 분담 이미지)

---

## 담당자 진입점 (P1~P4)

| 담당 | 영역 | 시작 파일 |
| --- | --- | --- |
| **P1** | 증권 연동 / 주문 실행 / Trade 생명주기 / 보고서 트리거 | `src/lib/broker/**`, `src/app/api/orders/**`, `src/app/api/trades/route.ts`, `src/app/api/broker/token/route.ts`, `prisma/schema.prisma` |
| **P2** | 프론트 화면 (주문·경고·거래·보고서) | `src/app/(dashboard)/**` |
| **P3** | Gemini 사망/생존 보고서 + 조항 제안 | `src/lib/gemini/report.ts`, `src/app/api/reports/route.ts` |
| **P4** | 규칙엔진 (precheck 검사) + 조항 시드/CRUD | `src/lib/rules/**`, `src/app/api/will/route.ts`, `prisma/seed.ts` |

**계약선**: `src/lib/broker/types.ts`(Broker), `src/lib/rules/types.ts`(PrecheckResult),
`src/lib/gemini/report.ts`(GeneratedReport). 이 인터페이스 시그니처를 바꿀 땐 팀에 공유하세요.

---

## 핵심 흐름

```
유언 조항 작성(P4)  →  주문 입력(P2)  →  precheck 게이트(P4 검사·P1 배선)
   ↓ 위반?                                         ↓
강행 사유 기록  ────────────────►  주문 실행(P1) → Trade(OPEN)
                                                   ↓ 청산
                                              Trade(CLOSED) → 보고서 생성(P3)
                                                   ↓
                                       사망/생존 보고서 + 새 조항 제안(P3) → 유언장 갱신
```

---

## 프로젝트 구조

```
src/
  app/
    page.tsx                  랜딩
    (dashboard)/              대시보드 (공통 레이아웃 + 4화면)  [P2]
      trades/ order/ will/ reports/
    api/                      Route Handlers (BFF)
      orders/precheck/  orders/  trades/  will/  reports/  broker/token/
  lib/
    prisma.ts                 Prisma 싱글톤
    utils.ts                  cn() (shadcn)
    broker/                   Broker 인터페이스 + Mock/KIS            [P1]
    rules/                    precheck 룰 타입 + engine               [P4]
    gemini/                   보고서/조항 생성                        [P3]
prisma/
  schema.prisma              데이터 모델 (User·BrokerAccount·WillClause·Trade·Order·TradeReport)
  seed.ts                    데모 시드
```

## 데이터 모델 (요약)

- **User** — 사용자 (MVP 자체 보관, 추후 Supabase auth 매핑 가능)
- **BrokerAccount** — 계좌 + KIS 토큰 캐시
- **WillClause** — 유언 조항: `ruleType`+`params`(룰) & `displayText`(자연어)
- **Trade** — 매수~매도 묶음 (`OPEN`/`CLOSED`, `thesis`)
- **Order** — 개별 주문 (`overrideReason` 강행 사유 포함)
- **TradeReport** — Gemini 산출 보고서 (`DEATH`/`SURVIVAL`)

## API 라우트

| 메서드 | 경로 | 설명 | 담당 |
| --- | --- | --- | --- |
| POST | `/api/orders/precheck` | 주문 게이팅 검사 | P1+P4 |
| POST | `/api/orders` | 주문 실행 | P1 |
| GET/POST | `/api/trades` | 거래 조회/생성 | P1 |
| GET/POST | `/api/will` | 유언 조항 CRUD | P4 |
| POST | `/api/reports` | 보고서 생성 | P3 |
| GET/POST | `/api/broker/token` | KIS 토큰 상태/갱신 | P1 |

> 현재 모든 라우트는 `501 not implemented` 스텁입니다. 각 핸들러 상단 주석의 *구현 가이드*를 따르세요.

---

## 협업 규칙

- 작업은 브랜치에서: `feat/p1-kis-broker` 처럼 `feat/<담당>-<내용>` → PR.
- `npm run lint` / `npm run build` 통과 후 PR.
- shadcn 컴포넌트는 필요할 때 `npx shadcn@latest add <name>` 로 추가.
- 환경변수 추가 시 `.env.example` 도 함께 갱신.
