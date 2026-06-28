# xorud UI → SKYSH 이식 설계

**날짜:** 2026-06-28  
**범위:** xorud(Vite+React 단일 App.tsx, 12개 화면)의 UI를 SKYSH(Next.js 16 App Router)로 이식  
**제약:** mock 데이터 유지, API 연결 없음 (이후 각 담당자가 연결)

---

## 1. 라우팅 구조

```
src/app/
├── page.tsx                        ← Landing (故래소 소개 + CTA)
├── connect/
│   └── page.tsx                    ← 계좌 연동 (사이드바 없음)
├── will/
│   └── setup/
│       └── page.tsx                ← 첫 유언장 작성 (사이드바 없음)
│
└── (dashboard)/                    ← 사이드바 레이아웃
    ├── layout.tsx                  ← Sidebar + 메인 영역으로 교체
    ├── page.tsx                    ← 홈 대시보드
    ├── order/
    │   └── page.tsx                ← 주문 폼 + WillPrecheckModal + 주문 접수 인라인
    ├── trades/
    │   └── page.tsx                ← 포지션 추적 + 거래 종료 결과 인라인
    ├── reports/
    │   └── page.tsx                ← 사망진단서/생존보고서 (?kind=death|survival)
    └── will/
        └── page.tsx                ← 나의 유언장 (조항 목록 + CRUD UI)
```

**레이아웃 규칙:**
- `/`, `/connect`, `/will/setup` → 풀 페이지 (사이드바 없음)
- `/(dashboard)/*` → 사이드바 레이아웃

**xorud screen → Next.js URL 매핑:**

| xorud screen | Next.js URL | 처리 방식 |
|---|---|---|
| landing | `/` | 페이지 교체 |
| connect | `/connect` | 신규 페이지 |
| will-setup | `/will/setup` | 신규 페이지 |
| dashboard | `/(dashboard)/` | 신규 페이지 |
| order | `/(dashboard)/order` | 기존 스텁 교체 |
| order-confirm | `/(dashboard)/order` | 주문 폼 내 조건부 렌더링 |
| position | `/(dashboard)/trades` | 기존 스텁 교체 |
| trade-closed | `/(dashboard)/trades` | 포지션 페이지 내 조건부 렌더링 |
| death-cert | `/(dashboard)/reports?kind=death` | 쿼리 파라미터로 전환 |
| survival-report | `/(dashboard)/reports?kind=survival` | 쿼리 파라미터로 전환 |
| my-will | `/(dashboard)/will` | 기존 스텁 교체 |

---

## 2. 컴포넌트 분해

### 공유 컴포넌트 (src/components/)

```
src/components/
├── sidebar.tsx                 ← xorud Sidebar 그대로 이식 (onNav → Link로 교체)
├── will-precheck-modal.tsx     ← xorud WillPrecheckModal 그대로 이식
└── cert-ui.tsx                 ← 소형 문서 UI 컴포넌트 묶음
    ├── OrnamentalDivider
    ├── CertStamp
    ├── CertSeal
    └── CertFieldRow
```

### Mock 데이터 (src/lib/mock-data.ts)

xorud App.tsx 상단의 모든 상수를 하나로 모음:
- `CHART_DATA` — 주가 차트 데이터
- `SETUP_CLAUSES` — 첫 유언장 템플릿 조항
- `MY_WILL_DATA` — 나의 유언장 조항 목록

### 페이지 로컬 컴포넌트

각 page.tsx 내부에 인라인으로 작성. 해당 페이지 밖에서 사용하지 않는 컴포넌트는 분리하지 않음.

---

## 3. xorud → Next.js 주요 변환 규칙

| xorud 패턴 | Next.js 변환 |
|---|---|
| `onNav("dashboard")` | `<Link href="/">` 또는 `router.push("/")` |
| `useState<Screen>` | 페이지 분리로 제거 |
| `"use client"` 필요 | useState/onClick 사용 컴포넌트에 추가 |
| `recharts` | `npm install recharts` 후 그대로 사용 |
| inline style dark modal | 그대로 유지 (Tailwind v4와 공존) |

**`"use client"` 필요 파일:**
- `sidebar.tsx` (active 상태 감지 → `usePathname`)
- `will-precheck-modal.tsx` (상태 있음)
- `order/page.tsx` (폼 state, 모달 토글)
- `trades/page.tsx` (탭 state)
- `reports/page.tsx` (kind 파라미터 읽기)
- `will/page.tsx` (조항 선택 state)
- `will/setup/page.tsx` (체크박스 state)

---

## 4. 의존성 변경

```bash
npm install recharts
```

기존 shadcn/ui 컴포넌트(`src/components/ui/`)는 xorud와 동일한 패키지이므로 추가 설치 불필요. xorud의 `src/app/components/ui/` 파일 중 SKYSH에 없는 것만 복사.

---

## 5. 팀 분담

| 담당 | 파일 |
|------|------|
| **P2** | `src/app/page.tsx` — Landing |
| **P2** | `src/app/connect/page.tsx` — 계좌 연동 |
| **P2** | `src/app/will/setup/page.tsx` — 첫 유언장 작성 |
| **P2** | `src/app/(dashboard)/layout.tsx` — 사이드바 레이아웃 |
| **P2** | `src/app/(dashboard)/page.tsx` — 홈 대시보드 |
| **P2** | `src/components/sidebar.tsx` |
| **P2** | `src/components/cert-ui.tsx` |
| **P2** | `src/lib/mock-data.ts` |
| **P1+P2** | `src/app/(dashboard)/order/page.tsx` |
| **P1+P2** | `src/components/will-precheck-modal.tsx` |
| **P1+P2** | `src/app/(dashboard)/trades/page.tsx` |
| **P3+P2** | `src/app/(dashboard)/reports/page.tsx` |
| **P4+P2** | `src/app/(dashboard)/will/page.tsx` |

**원칙:** P2가 UI 먼저 작성 → 각 담당자가 나중에 API 연결 시 해당 파일만 수정.

---

## 6. 완료 기준

- [ ] `npm run build` 통과 (타입 에러 없음)
- [ ] `/` Landing 화면 렌더링
- [ ] `/(dashboard)` 사이드바 레이아웃 작동
- [ ] `/order` 주문 폼 + precheck 모달 토글
- [ ] `/trades` 포지션 → 거래 종료 전환
- [ ] `/reports?kind=death` 사망진단서, `?kind=survival` 생존보고서
- [ ] `/will` 조항 목록 + 첫 유언장 작성 흐름
