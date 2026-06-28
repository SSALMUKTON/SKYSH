# 故래소 (SKYSH) — 투자 유언장 거래 서비스

투자자가 **자신의 나쁜 매매 습관을 "유언장"(원칙 조항)으로 박제**하고, 주문 직전 그 유언을 들이밀어
충동 거래를 막은 뒤, 거래가 끝나면 결과를 복기해 새 원칙으로 되먹이는 서비스.

**핵심 루프**
1. **유언장 작성** (`/will/setup`) — 퀴즈/자유작성 → Gemini 가 자연어를 `RuleType + params` 조항으로 변환.
2. **거래하기** (`/order`) — 종목 검색→시세·차트·재무·뉴스 확인→주문. 주문 전 활성 조항을 검사(`checkOrder`)해
   **실시간 체크리스트**(충족=초록/위반=빨강)로 보여준다. 검사는 **주문을 막지 않고**(사후 컴플라이언스),
   거래 후 의사결정 원인·(위반 시)강행 사유를 기록한다.
3. **복기** — 거래 청산 시 Gemini 가 **사망진단서(DEATH)/생존보고서(SURVIVAL)** 를 발급 → 새 조항 제안
   (`ClauseSuggestion`) → 승인하면 유언장에 반영.

이 레포는 **두 부분**이다: ① Next.js 앱(`src/`, 제품) · ② Python 데이터 파이프라인(`pipelines/`, `data/`, 앱과 독립).

---

## ⚠️ Next.js 16 — 네가 아는 그 Next.js 아님

브레이킹 체인지가 많다(API·관례·파일 구조 모두 학습 데이터와 다를 수 있음).
**코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 관련 가이드를 읽어라.** deprecation 경고를 무시하지 말 것.

---

# 1) Next.js 앱 (`src/`)

## 스택
- **Next.js 16.2.9** (App Router · Turbopack) · **React 19** · TypeScript
- **Prisma 6 + PostgreSQL(Supabase)** — `DATABASE_URL`(pooled) + `DIRECT_URL`(migration/direct)
- **Tailwind CSS 4** (`@tailwindcss/postcss`)
- **Gemini** (`@google/generative-ai`, 기본 `gemini-2.5-flash`) — 조항 변환 + 보고서 생성
- recharts(차트) · lucide-react(아이콘) · zod(검증)
- **hyparquet (+ hyparquet-compressors)** — `data/` 의 parquet 가격을 서버에서 직접 읽음(서버 전용)

## 실행
```bash
npm run dev          # next dev (Turbopack)
npm run db:generate  # prisma generate + scripts/patch-prisma.js (한글 경로 패치)
npm run db:push      # 스키마 동기화   ·   npm run db:seed  데모 시드
```
필요 env: `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY` (옵션: `GEMINI_MODEL`, `BROKER_PROVIDER`).

## 데이터 모델 (`prisma/schema.prisma` — 단일 진실원)
- **User** → **Trade**(매수~매도를 하나로 묶는 단위) → **Order**(개별 주문).
- **Clause** = 유언 조항: `ruleType`+`params`(실행 룰) **와** `displayText`(낭독용 자연어)를 함께 보유.
- **Report**(DEATH/SURVIVAL) → **ClauseSuggestion**(새 조항 제안, 승인 시 Clause 에 반영).
- `Order` 에 `forceReason`(강행 사유)·`willViolations`(precheck 위반 스냅샷)·`decisionReason` 기록.
- 코인 수량/가격은 `Decimal(20,8)`.
- **증권사 키는 DB 에 저장하지 않는다** → `BrokerAccount` 같은 키 저장 모델이 없다(아래 보안 규칙 참고).

## 라우트
대시보드 레이아웃(`(dashboard)/layout.tsx` + `components/sidebar.tsx`)에 묶인 화면:

| 경로 | 화면 |
|---|---|
| `/dashboard` | 홈 |
| `/order` | **거래하기** — 시세·차트·재무·뉴스 + 주문 + 실시간 유언장 체크리스트. 구 `/market`(시장탐색) 통합됨 |
| `/history` | 거래 기록 (+ 과거 거래 수동입력) |
| `/will` | 나의 유언장 |
| `/reports` | 거래 보고서(사망/생존) |
| `/backtest` | 백테스트 |
| `/settings` | 설정 |

레이아웃 밖(풀스크린): `/will/setup`(유언장 작성) · `/connect`(증권사 연결) · `/`(랜딩).

## API (`src/app/api`)
- **market**: `quote` · `universe` · `series` · `fundamentals` · `news` — 브로커 시세 + `lib/data` 캐시.
- **order**: `precheck`(활성 조항 검사 → 위반 목록) · `execute`(주문 실행 + Trade lifecycle:
  매수→`OPEN`(평단 가산), 매도→`CLOSED`+`pnlPct`/`holdDurationMin`, 청산 시 `/api/reports` best-effort 트리거).
- `orders/reason` — 거래 후 의사결정 원인/강행 사유 저장.
- `trades` — 목록(GET) · 수동입력(POST) · 삭제(DELETE).
- **clauses**: `route`(CRUD) · `[id]` · `convert`(자연어→조항, Gemini) · `batch-convert` · `batch-save` · `suggestions/[id]`(제안 승인/거절).
- `reports`(보고서 생성, Gemini) · `backtest`.

## lib
- **`lib/data/`** (서버 전용): `data/` parquet 가격을 hyparquet 로 읽고 universe/fundamentals/news 를 제공.
  `paths.ts` 는 `path.join` 대신 슬래시 템플릿을 쓴다(Turbopack 과다추적 경고 회피).
- **`lib/broker/`**: `Broker` 인터페이스 + `MockBroker`(기본, 키 불필요) / `KisBroker`(`BROKER_PROVIDER=kis`).
  `credsFromRequest` 가 `Authorization: Bearer <base64(JSON)>` 를 파싱. Mock 은 symbol 에 `"SURGE"` 가 들어가면
  `changePct=18` 을 강제한다(룰 위반 테스트용).
- **`lib/rules/`**: `engine.ts` 의 `checkOrder(order, market, clauses)` — **순수 함수, 클라/서버 공용**
  (거래 화면의 실시간 체크리스트가 이 엔진을 그대로 재사용). `types.ts` 에 `OrderDraft`·`Violation` 등.
- **`lib/gemini/`**: `report.ts`(보고서) + `prompts.ts`. 조항 제안은 자유텍스트 금지 — `RuleType`+`params` 만.
- **`lib/api-client.ts`**: 프론트용 얇은 클라이언트. API 실패/stub 시 **mock 으로 폴백**하고 `{ data, mocked }`
  를 돌려준다(`mocked=true` 면 개발용 배지를 띄움).
- 기타: `prisma.ts` · `user.ts`(`getDemoUser` — 인증 없이 단일 데모 유저 `demo@goraeso.dev`) ·
  `format.ts` · `order-schema.ts`(zod) · `trades.ts`.

## 규칙 / 관례 (수정 시 반드시 인지)
- **인증 없음(MVP)**: 모든 라우트가 `getDemoUser()` 단일 유저를 공유한다(추후 Supabase auth 매핑).
- **증권사/거래소 키는 서버에 저장 금지** — 클라이언트 `localStorage` → 요청마다 `Authorization` 헤더 →
  서버는 중계만. 그래서 키 저장 모델·DB 컬럼이 없다.
- **precheck 는 주문을 막지 않는다**(사후 컴플라이언스). 손절 미입력 등은 `block` 이 아닌 `warn`.
  거래 후 확인 화면에서 의사결정 원인(+위반 시 강행 사유)을 받는다.
- **mock 우선**: 키/DB 없이도 돌아가도록 브로커·api-client 가 폴백한다. `mocked` 배지로 노출.
- `next.config.ts` 의 `serverExternalPackages` 에 prisma·hyparquet 가 등록돼 있다 — 이 모듈들은 서버에서만.

---

# 2) 데이터 파이프라인 (`pipelines/`, `data/`)

복기/룰엔진이 쓸 과거 가격·뉴스·공시·재무·매크로를 자산군(미국/국내/코인)별로 **동일 스키마**로 수집한다.
앱과 **독립**적으로 동작. 상세 문서: `pipelines/README.md`.

## 실행
```bash
pip install -r requirements.txt
cp .env.example .env   # 파이프라인 키 채우기(전부 무료). 가격 수집은 키 불필요
python -m pipelines.run <us|kr|crypto|all> <dataset> [--start --end --overwrite --source]
# 예) python -m pipelines.run kr all          (KOSPI, 무계좌)
#     python -m pipelines.run us sec --no-facts
```

## 구조 / 소스
- **미국** `pipelines/us`: yfinance(가격) · Alpaca(뉴스) · FRED(매크로) · SEC(공시·재무: facts→fundamentals)
- **국내** `pipelines/kr`: **pykrx**(가격·무계좌·기본) · DART(공시·정형재무) · KRX(밸류에이션) · ECOS(매크로).
  KIS 는 `--source kis`(실시간/주문, 계좌 필요)일 때만.
- **코인** `pipelines/crypto`: Upbit(일봉)
- **공통** `pipelines/common`: config / http(레이트리밋·재시도) / io(원자적저장·증분·실패요약) / universe

## 데이터 (`data/`, 커밋됨)
- `data/{us,kr,crypto}/` 자산군별. 가격 parquet 은 3군 동일: 인덱스 `Date`(datetime64[ms]),
  컬럼 `Close/High/Low/Open/Volume`(일봉/수정주가). 앱(`lib/data`)이 hyparquet 로 이 파일을 읽는다.
- US: `prices` · `news` · `macro/fred` · `sec/{filings,facts,fundamentals,company_tickers}`
- KR: `prices` · `disclosures` · `fundamentals` · `valuation` · `macro/ecos` · `universe`
- crypto: `prices` · `universe`
- 2.4GB(git pack ~198MB)이나 파이프라인으로 재생성 가능. `.env`(비밀)는 커밋 금지(`.gitignore` `.env*`).

## 동작 규칙 / 주의 (수정 시 반드시 인지)
- **증분 수집**: 시계열은 마지막 저장일 이후만, 이미 최신이면 호출 자체 skip(주식은 주말 보정).
  스냅샷(SEC/DART)은 파일 있으면 종목 skip. 전체 재수집은 `--overwrite`.
- **rate limit**: 요청 4회 + 종목 3회 재시도 + 단계별 오류 격리(`_safe`) + 끝에 실패 목록 출력.
  남은 누락은 같은 명령 재실행으로 보완(시계열 과거 구간 갭은 `--overwrite` 필요).
- **KRX(pykrx) 변동성**: KRX 가 종목목록·지수구성·밸류에이션 엔드포인트에 빈 응답을 줄 때가 있다 →
  **유니버스는 KRX KIND(`corpList.do`)** 로 받는다(안정). KOSPI200 은 pykrx 지수구성이 되면 사용,
  안 되면 시장 전체 폴백. 가격(`get_market_ohlcv`)은 정상. valuation 은 빈 응답이면 0건(비치명적).
  `pd.read_html` 에 **lxml 필요**.
- **SEC fundamentals**: facts 에서 파생(분기 누적 차분으로 OCF·Q4 복원). 추출 로직 수정 후엔
  **로컬 facts 로 재계산하면 됨(재다운로드 불필요)**. 외국 20-F 제출사는 quarters 비어있음(정상).
- **GDELT 제거됨**. 매크로는 US=FRED, KR=ECOS.

## 미결 항목
국내·코인 뉴스 소스 미정 / ECOS 통계코드 키로 실측 검증(+실업률·소비심리 추가) /
KRX valuation 엔드포인트 복구 시 재수집.
