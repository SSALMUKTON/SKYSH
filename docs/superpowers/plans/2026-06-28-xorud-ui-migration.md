# xorud UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** xorud의 12개 화면(Vite+React 단일 App.tsx)을 SKYSH의 Next.js 16 App Router 페이지로 이식한다. mock 데이터 유지, API 연결 없음.

**Architecture:** 공유 컴포넌트(Sidebar, WillPrecheckModal, cert-ui)를 먼저 만든 뒤, 각 페이지를 순서대로 교체한다. 사이드바 레이아웃은 `(dashboard)` 라우트 그룹의 layout.tsx가 담당한다. 인터랙션이 필요한 페이지만 `"use client"`, 나머지는 서버 컴포넌트.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, lucide-react (이미 설치됨), recharts (추가 필요), TypeScript

---

## 파일 맵

| 파일 | 역할 | 클라이언트? |
|------|------|------------|
| `src/lib/mock-data.ts` | CHART_DATA, SETUP_CLAUSES, MY_WILL_DATA 상수 | 서버 |
| `src/components/cert-ui.tsx` | OrnamentalDivider, CertStamp, CertSeal 공유 컴포넌트 | 서버 |
| `src/components/will-precheck-modal.tsx` | 유언장 낭독 모달 | 클라이언트 |
| `src/components/sidebar.tsx` | 대시보드 사이드바 (usePathname) | 클라이언트 |
| `src/app/(dashboard)/layout.tsx` | Sidebar + main 레이아웃 (교체) | 서버 |
| `src/app/page.tsx` | Landing 화면 (교체) | 서버 |
| `src/app/connect/page.tsx` | 계좌 연동 화면 (신규) | 서버 |
| `src/app/will/setup/page.tsx` | 첫 유언장 작성 (신규, checkbox state) | 클라이언트 |
| `src/app/(dashboard)/dashboard/page.tsx` | 홈 대시보드 (신규) | 서버 |
| `src/app/(dashboard)/order/page.tsx` | 주문 폼 + confirm (교체, form state) | 클라이언트 |
| `src/app/(dashboard)/trades/page.tsx` | 포지션 + 거래종료 (교체, step state) | 클라이언트 |
| `src/app/(dashboard)/reports/page.tsx` | 사망/생존 보고서 (교체, searchParams) | 서버 (async) |
| `src/app/(dashboard)/will/page.tsx` | 나의 유언장 (교체) | 서버 |

**URL 맵:**
- `/` → Landing
- `/connect` → 계좌 연동
- `/will/setup` → 첫 유언장 작성
- `/dashboard` → 홈 대시보드 (사이드바 있음)
- `/order` → 주문 (사이드바 있음)
- `/trades` → 포지션 추적 (사이드바 있음)
- `/reports?kind=death` → 사망진단서 (사이드바 있음)
- `/reports?kind=survival` → 생존보고서 (사이드바 있음)
- `/will` → 나의 유언장 (사이드바 있음)

---

## Task 0: recharts 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: recharts 설치**

```bash
npm install recharts
```

- [ ] **Step 2: 설치 확인**

```bash
node -e "require('recharts'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency"
```

---

## Task 1: Mock 데이터 모듈

**Files:**
- Create: `src/lib/mock-data.ts`

- [ ] **Step 1: 파일 생성**

`src/lib/mock-data.ts` 를 아래 내용으로 생성한다:

```ts
export const CHART_DATA = [
  { t: "09:30", p: 248.5 }, { t: "10:00", p: 251.2 },
  { t: "10:30", p: 258.8 }, { t: "11:00", p: 255.3 },
  { t: "11:30", p: 262.1 }, { t: "12:00", p: 259.4 },
  { t: "12:30", p: 268.7 }, { t: "13:00", p: 265.2 },
  { t: "13:30", p: 271.5 }, { t: "14:00", p: 269.8 },
  { t: "14:30", p: 275.3 },
];

export const SETUP_CLAUSES = [
  "나는 급등 직후 시장가로 추격 매수하지 않는다.",
  "나는 손절 기준 없는 거래를 시작하지 않는다.",
  "나는 손실 만회를 목적으로 같은 날 재진입하지 않는다.",
  "나는 확신이 있어도 한 번에 전액 매수하지 않는다.",
  "나는 목표 수익률과 손절 기준을 먼저 작성한다.",
];

export const MY_WILL_DATA = [
  { id: 1, art: "제1조", text: "나는 급등 직후 시장가로 추격 매수하지 않는다.", source: "TSLA 2024.03", violations: 3, lastDate: "2026.05.12" },
  { id: 2, art: "제2조", text: "나는 프리마켓 갭상 직후 시장가로 매수하지 않는다.", source: "TSLA 2026.06", violations: 1, lastDate: "2026.06.22" },
  { id: 3, art: "제3조", text: "나는 손절 기준 없는 거래를 시작하지 않는다.", source: "NVDA 2024.11", violations: 2, lastDate: "2026.04.08" },
  { id: 4, art: "제4조", text: "나는 목표 수익률과 손절 기준을 먼저 작성한다.", source: "AAPL 2026.06", violations: 0, lastDate: "—" },
  { id: 5, art: "제5조", text: "나는 수익 구간에서도 목표가에 도달하면 일부라도 실현한다.", source: "AAPL 2026.06", violations: 0, lastDate: "—" },
];
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/mock-data.ts
git commit -m "feat: add mock data module"
```

---

## Task 2: 공유 문서 UI 컴포넌트

**Files:**
- Create: `src/components/cert-ui.tsx`

- [ ] **Step 1: 파일 생성**

`src/components/cert-ui.tsx` 를 아래 내용으로 생성한다:

```tsx
export function OrnamentalDivider({ color = "#C9A227" }: { color?: string }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
      <span style={{ color: `${color}65`, fontSize: 8, lineHeight: 1 }}>◆</span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
    </div>
  );
}

export function CertStamp({ color, text, sub }: { color: string; text: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-3 py-1.5"
      style={{ border: `3px double ${color}`, opacity: 0.55, transform: "rotate(-13deg)" }}
    >
      <p style={{ fontSize: 14, fontWeight: 900, color, letterSpacing: "0.18em", lineHeight: 1 }}>{text}</p>
      <div style={{ width: "100%", height: 1, backgroundColor: color, opacity: 0.5 }} />
      <p style={{ fontSize: 7, fontWeight: 700, color, letterSpacing: "0.25em" }}>{sub}</p>
    </div>
  );
}

export function CertSeal({
  color, line1, line2, rotate = -15,
}: {
  color: string; line1: string; line2: string; rotate?: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5"
      style={{
        width: 56, height: 56, borderRadius: "50%",
        border: `2px double ${color}`, opacity: 0.5,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <span style={{ fontSize: 7, fontWeight: 900, color, letterSpacing: "0.15em", lineHeight: 1 }}>{line1}</span>
      <div style={{ width: 28, height: 1, backgroundColor: color, opacity: 0.6 }} />
      <span style={{ fontSize: 6, fontWeight: 700, color, letterSpacing: "0.08em" }}>{line2}</span>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/cert-ui.tsx
git commit -m "feat: add shared cert UI components"
```

---

## Task 3: WillPrecheckModal 컴포넌트

**Files:**
- Create: `src/components/will-precheck-modal.tsx`

- [ ] **Step 1: 파일 생성**

`src/components/will-precheck-modal.tsx` 를 아래 내용으로 생성한다:

```tsx
"use client";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onProceed: () => void;
}

export function WillPrecheckModal({ onClose, onProceed }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 6, 14, 0.82)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{ background: "#0D0B16", border: "1px solid rgba(201,162,39,0.25)" }}
      >
        {/* Header */}
        <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 18 }}>🕯️</span>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(201,162,39,0.7)" }}>
                  유언장 낭독 의식
                </p>
              </div>
              <h3 className="text-xl font-black tracking-tight" style={{ color: "#F5F0E6" }}>
                투자 유언장 낭독
              </h3>
              <p style={{ color: "rgba(245,240,230,0.35)", fontSize: 11, marginTop: 2 }}>
                주문 실행 전, 과거의 당신이 남긴 유언을 읽겠습니다.
              </p>
            </div>
            <button onClick={onClose} style={{ color: "rgba(245,240,230,0.3)" }} className="hover:opacity-70 transition-opacity mt-0.5">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="px-6 py-3" style={{ background: "rgba(184,53,53,0.15)", borderBottom: "1px solid rgba(184,53,53,0.25)" }}>
          <p style={{ color: "#E07070", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            현재 주문은 유언장 <strong style={{ color: "#EF9090" }}>제2조</strong>를 위반할 가능성이 있습니다.
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Clause citation */}
          <div className="mb-4" style={{ borderLeft: "3px solid rgba(201,162,39,0.5)", paddingLeft: 14 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(201,162,39,0.7)", marginBottom: 6 }}>
              유언장 제2조 全文
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E6", lineHeight: 1.7, fontStyle: "italic" }}>
              &ldquo;나는 프리마켓 갭상 직후 시장가로 매수하지 않는다.&rdquo;
            </p>
          </div>

          {/* Evidence */}
          <div className="mb-5" style={{ border: "1px solid rgba(245,240,230,0.08)" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(245,240,230,0.4)", padding: "8px 12px", borderBottom: "1px solid rgba(245,240,230,0.08)", textTransform: "uppercase" }}>
              현황 증거
            </p>
            {[
              { label: "거래 시간", value: "프리마켓", warn: true },
              { label: "전일 종가 대비 상승률", value: "+8.4%", warn: true },
              { label: "주문 방식", value: "시장가 매수", warn: true },
              { label: "손절 기준", value: "미입력", warn: true },
              { label: "과거 유사 거래", value: "3회 중 2회 손실 (66.7%)", warn: false },
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-center px-3 py-2" style={{ borderBottom: "1px solid rgba(245,240,230,0.06)" }}>
                <span style={{ fontSize: 11, color: "rgba(245,240,230,0.45)" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: warn ? "#E07070" : "rgba(245,240,230,0.75)" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {["10분 뒤 다시 보기", "지정가 주문으로 변경", "매수 금액 줄이기", "손절 기준 먼저 작성"].map((label) => (
              <button
                key={label}
                onClick={onClose}
                className="w-full py-2.5 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(245,240,230,0.12)", color: "rgba(245,240,230,0.65)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,240,230,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {label}
              </button>
            ))}
            <button
              onClick={onProceed}
              className="w-full py-3 text-sm font-black tracking-wider transition-opacity hover:opacity-85"
              style={{ background: "#B83535", color: "#fff", letterSpacing: "0.1em" }}
            >
              그래도 주문하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/will-precheck-modal.tsx
git commit -m "feat: add WillPrecheckModal component"
```

---

## Task 4: Sidebar 컴포넌트

**Files:**
- Create: `src/components/sidebar.tsx`

- [ ] **Step 1: 파일 생성**

`src/components/sidebar.tsx` 를 아래 내용으로 생성한다:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, FileText, Settings, Scroll } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "홈", href: "/dashboard" },
  { icon: TrendingUp, label: "거래하기", href: "/order" },
  { icon: Scroll, label: "나의 유언장", href: "/will" },
  { icon: FileText, label: "거래 보고서", href: "/reports" },
  { icon: Settings, label: "설정", href: "/connect" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-card border-r border-border h-screen sticky top-0 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <Link href="/dashboard" className="block text-left">
          <p className="text-[22px] font-black tracking-tight text-foreground leading-none">故래소</p>
          <p className="text-[10px] tracking-[0.15em] text-muted-foreground mt-1.5 uppercase">투자 유언장 거래 서비스</p>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-border/60">
        <p className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">문서 분류</p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1" />

      <div className="p-3 mx-3 mb-4 bg-[#FDF8EC] border border-[#C9A227]/30">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 bg-[#C9A227] block shrink-0" />
          <span className="text-[10px] font-bold text-[#7A5F0E] tracking-wider">유언장 알림</span>
        </div>
        <p className="text-[10px] text-[#7A5F0E]/70 leading-relaxed">프리마켓 주문 전 제2조를 확인하세요.</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add Sidebar component with Next.js Link navigation"
```

---

## Task 5: Dashboard 레이아웃 교체

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: 레이아웃 파일 교체**

`src/app/(dashboard)/layout.tsx` 를 아래 내용으로 교체한다:

```tsx
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 overflow-auto min-h-screen">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음 (기존 stub 페이지들이 그대로이므로 통과)

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "feat: replace dashboard layout with sidebar"
```

---

## Task 6: Landing 페이지 교체

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 페이지 교체**

`src/app/page.tsx` 를 아래 내용으로 교체한다:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrnamentalDivider } from "@/components/cert-ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-12 py-4 border-b border-border">
        <span className="text-xl font-black text-foreground tracking-tight">故래소</span>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          로그인
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-3xl border border-foreground/12 p-0.5">
          <div className="border border-foreground/6 p-10 text-center bg-card">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(to right, transparent, rgba(201,162,39,0.4))" }} />
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#C9A227] uppercase">공식 서비스 안내</span>
              <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(to left, transparent, rgba(201,162,39,0.4))" }} />
            </div>

            <h1 className="text-7xl font-black text-foreground mb-3 tracking-tighter">故래소</h1>
            <OrnamentalDivider />
            <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed mb-10">
              죽은 거래가 남긴 유언장을 다음 주문 전에 읽어드립니다.
            </p>

            <div className="grid grid-cols-3 gap-0 mb-10 border border-border">
              {[
                { num: "一", title: "주문 전 유언장 검사", desc: "과거 손실 거래가 남긴 교훈을 주문 직전에 자동으로 낭독합니다." },
                { num: "二", title: "사망진단서 / 생존보고서", desc: "거래 종료 후 원인을 분석하고 공식 문서로 발행합니다." },
                { num: "三", title: "투자 유언장 업데이트", desc: "거래 경험을 바탕으로 나만의 투자 원칙을 쌓아갑니다." },
              ].map(({ num, title, desc }, i) => (
                <div key={num} className={`p-6 text-left ${i < 2 ? "border-r border-border" : ""}`}>
                  <p className="text-2xl font-black text-[#C9A227] mb-3 opacity-60">{num}</p>
                  <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <Link
              href="/connect"
              className="bg-foreground text-background px-8 py-3.5 font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              증권 계좌 연동하기
              <ChevronRight size={15} />
            </Link>

            <OrnamentalDivider />
            <p className="text-[10px] text-muted-foreground tracking-wide">
              본 서비스는 투자 추천 서비스가 아닙니다 · 모든 투자 판단은 본인의 책임입니다
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace landing page with xorud UI"
```

---

## Task 7: Connect 페이지 신규 생성

**Files:**
- Create: `src/app/connect/page.tsx`

- [ ] **Step 1: 디렉토리 + 파일 생성**

`src/app/connect/page.tsx` 를 아래 내용으로 생성한다:

```tsx
import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-12 py-4 border-b border-border">
        <Link href="/" className="text-lg font-black text-foreground tracking-tight">故래소</Link>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">증권사 계좌 연동</span>
      </header>

      <main className="flex-1 flex items-center justify-center py-16 px-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-1.5">증권사 계좌 연동</h2>
          <p className="text-sm text-muted-foreground mb-8">거래하기 전에 증권사 API를 연결해 주세요.</p>

          <div className="bg-card border border-border p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0052C8] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">KIS</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">한국투자증권 Open API</p>
                <p className="text-xs text-muted-foreground">계좌번호 ****-****-1234</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3D9E72] bg-[#EBF7F3] px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-[#3D9E72] block" />
              연결됨
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "예수금 잔고", value: "₩4,823,400" },
              { label: "보유 종목 수", value: "3 종목" },
              { label: "API 권한", value: "조회 / 주문" },
              { label: "연동 일시", value: "2026.06.28 09:12" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border p-4">
                <p className="text-[10px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
                <p className="text-sm font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#FDF8EC] border border-[#C9A227]/30 px-4 py-3 mb-6 flex items-start gap-3">
            <Shield size={13} className="text-[#C9A227] mt-0.5 shrink-0" />
            <p className="text-xs text-[#7A5F0E] leading-relaxed">
              실제 주문 전에는 반드시 유언장 검사를 거칩니다. 故래소는 귀하의 투자 결정에 개입하지 않으며, 과거 거래 패턴을 분석해 경고만 제공합니다.
            </p>
          </div>

          <Link
            href="/will/setup"
            className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            계좌 연동 완료
          </Link>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/connect/page.tsx
git commit -m "feat: add connect page"
```

---

## Task 8: Will Setup 페이지

**Files:**
- Create: `src/app/will/setup/page.tsx`

- [ ] **Step 1: 디렉토리 + 파일 생성**

`src/app/will/setup/page.tsx` 를 아래 내용으로 생성한다:

```tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, CheckCircle } from "lucide-react";
import { OrnamentalDivider } from "@/components/cert-ui";
import { SETUP_CLAUSES } from "@/lib/mock-data";

export default function WillSetupPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));

  function toggle(i: number) {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-12 py-4 border-b border-border">
        <Link href="/" className="text-lg font-black text-foreground">故래소</Link>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">첫 투자 유언장 작성</span>
      </header>

      <main className="flex-1 flex items-start justify-center py-12 px-8">
        <div className="w-full max-w-lg">
          <div className="border border-[#C9A227]/40 border-b-0 bg-[#FDF8EC] px-8 pt-7 pb-5">
            <div className="text-center">
              <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">나의 첫 투자 유언장</p>
              <h2 className="text-xl font-black text-foreground mb-3 tracking-tight">투 자 유 언 장 작 성</h2>
              <OrnamentalDivider />
              <p className="text-xs text-[#7A5F0E]/80 leading-relaxed mt-2">
                아래의 조항을 선택함으로써 귀하는 이를 투자 원칙으로 준수할 것을<br />스스로에게 엄숙히 서약합니다.
              </p>
            </div>
          </div>

          <div className="border-x border-[#C9A227]/40 bg-card px-6 py-4 space-y-2">
            {SETUP_CLAUSES.map((clause, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border text-left transition-all ${
                  selected.has(i) ? "border-[#C9A227]/50 bg-[#FDF8EC]" : "border-border bg-background hover:border-foreground/15"
                }`}
              >
                <div
                  className="mt-0.5 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    width: 18, height: 18,
                    border: `2px solid ${selected.has(i) ? "#C9A227" : "rgba(26,23,32,0.2)"}`,
                    background: selected.has(i) ? "#C9A227" : "transparent",
                  }}
                >
                  {selected.has(i) && <CheckCircle size={11} className="text-white" />}
                </div>
                <span className="text-sm text-foreground leading-relaxed">
                  <span className="font-black text-[#C9A227]">제{i + 1}조.</span>{" "}
                  {clause}
                </span>
              </button>
            ))}
          </div>

          <div className="border border-[#C9A227]/40 border-t-0 bg-[#FDF8EC] px-8 py-5">
            <OrnamentalDivider />
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#7A5F0E]/70">
                선택한 조항: <span className="font-black text-[#C9A227]">{selected.size}개</span>
              </p>
              <p className="text-xs text-[#7A5F0E]/70">2026년 6월 28일 서약</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              disabled={selected.size === 0}
              className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              유언장 저장하기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/will/setup/page.tsx
git commit -m "feat: add will setup page"
```

---

## Task 9: Dashboard 홈 페이지

**Files:**
- Create: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: 파일 생성**

`src/app/(dashboard)/dashboard/page.tsx` 를 아래 내용으로 생성한다:

```tsx
import Link from "next/link";
import {
  Shield, BarChart2, FileText, CheckCircle, Scroll,
  Bell, AlertTriangle, AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">홈</h1>
            <p className="text-sm text-muted-foreground mt-1">2026년 6월 28일 토요일 · 프리마켓 진행 중</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#FDF8EC] border border-[#C9A227]/30 px-3 py-1.5">
            <Bell size={12} className="text-[#C9A227]" />
            <span className="text-xs font-semibold text-[#7A5F0E]">유언장 알림 1건</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: "연결 계좌", value: "KIS 한국투자", icon: Shield, color: "text-foreground" },
            { label: "보유 종목", value: "3 종목", icon: BarChart2, color: "text-foreground" },
            { label: "사망진단서", value: "7 건", icon: FileText, color: "text-[#B83535]" },
            { label: "생존보고서", value: "4 건", icon: CheckCircle, color: "text-[#3D9E72]" },
            { label: "유언장 조항", value: "5 조항", icon: Scroll, color: "text-[#C9A227]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border p-4">
              <Icon size={14} className={`${color} mb-3`} />
              <p className="text-[10px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
              <p className="text-base font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          {/* Warning */}
          <div>
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wider uppercase">
              <AlertTriangle size={12} className="text-[#B83535]" />
              오늘의 유언장 경고
            </h3>
            <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-4 h-[calc(100%-2rem)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-[#B83535] tracking-wider">제2조 위반 가능성</span>
                <span className="text-[9px] text-muted-foreground border border-border bg-card px-1.5 py-0.5">프리마켓</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed mb-4">
                TSLA가 전일 대비 <strong>+8.4%</strong> 상승 중입니다. 프리마켓 갭상 직후 매수는 유언장 제2조를 위반할 수 있습니다.
              </p>
              <Link href="/order" className="text-xs font-black text-[#B83535] hover:underline underline-offset-2 tracking-wide">
                주문 화면에서 확인 →
              </Link>
            </div>
          </div>

          {/* Recent reports */}
          <div className="col-span-2">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wider uppercase">
              <FileText size={12} className="text-muted-foreground" />
              최근 거래 보고서
            </h3>
            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["종목", "구분", "수익률", "날짜", ""].map((h) => (
                      <th key={h} className={`px-4 py-2.5 text-[9px] font-bold text-muted-foreground tracking-widest uppercase ${h === "수익률" || h === "날짜" || h === "" ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ticker: "TSLA", type: "death", rate: "-4.3%", date: "2026.06.22" },
                    { ticker: "AAPL", type: "survival", rate: "+3.1%", date: "2026.06.18" },
                    { ticker: "NVDA", type: "death", rate: "-7.8%", date: "2026.06.10" },
                    { ticker: "MSFT", type: "survival", rate: "+2.4%", date: "2026.05.28" },
                  ].map(({ ticker, type, rate, date }) => (
                    <tr key={date} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-foreground">{ticker}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 ${
                          type === "death" ? "bg-[#FAEAEA] text-[#B83535]" : "bg-[#EBF7F3] text-[#3D9E72]"
                        }`}>
                          {type === "death" ? "사망진단서" : "생존보고서"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold text-right ${type === "death" ? "text-[#B83535]" : "text-[#3D9E72]"}`}>
                        {rate}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-right">{date}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reports?kind=${type === "death" ? "death" : "survival"}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Most violated clauses */}
        <div>
          <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 tracking-wider uppercase">
            <AlertCircle size={12} className="text-[#C9A227]" />
            가장 많이 위반한 조항
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { art: "제1조", text: "급등 직후 시장가 추격 매수 금지", violations: 3, pct: 75 },
              { art: "제3조", text: "손절 기준 없는 거래 시작 금지", violations: 2, pct: 50 },
              { art: "제2조", text: "프리마켓 갭상 직후 시장가 매수 금지", violations: 1, pct: 25 },
            ].map(({ art, text, violations, pct }) => (
              <div key={art} className="bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#C9A227]">{art}</span>
                  <span className="text-xs font-bold text-[#B83535]">{violations}회 위반</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{text}</p>
                <div className="h-1 bg-muted overflow-hidden">
                  <div className="h-full bg-[#B83535]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: add dashboard home page"
```

---

## Task 10: Order 페이지 교체

**Files:**
- Modify: `src/app/(dashboard)/order/page.tsx`

xorud의 OrderScreen + OrderConfirmScreen을 `useState<"form" | "confirm">(step)` 으로 합친다. "그래도 주문하기" → `setStep("confirm")`, "체결 상태 보기" → `/trades` 로 이동.

- [ ] **Step 1: 페이지 교체**

`src/app/(dashboard)/order/page.tsx` 를 아래 내용으로 교체한다:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle, Scroll,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { WillPrecheckModal } from "@/components/will-precheck-modal";
import { CHART_DATA } from "@/lib/mock-data";

type Step = "form" | "confirm";
type Side = "매수" | "매도";
type PriceType = "시장가" | "지정가";

export default function OrderPage() {
  const [step, setStep] = useState<Step>("form");
  const [showModal, setShowModal] = useState(false);
  const [side, setSide] = useState<Side>("매수");
  const [priceType, setPriceType] = useState<PriceType>("시장가");
  const [qty, setQty] = useState("3");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [reason, setReason] = useState("");

  const amount = qty && !isNaN(parseFloat(qty))
    ? Math.round(parseFloat(qty) * 275.3 * 1356).toLocaleString("ko-KR")
    : "—";

  if (step === "confirm") {
    const confirmSteps = [
      { label: "주문 요청", done: true },
      { label: "유언장 검사", done: true },
      { label: "증권사 API 전송", done: true },
      { label: "체결 대기", done: false, active: true },
    ];
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-14 h-14 bg-[#EBF7F3] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-[#3D9E72]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">주문이 접수되었습니다</h2>
          <p className="text-sm text-muted-foreground mb-8">증권사 API로 주문이 전송되었습니다.</p>

          <div className="bg-card border border-border p-5 text-left mb-4">
            <p className="text-[9px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">주문 상세</p>
            {[
              { label: "종목", value: "TSLA (Tesla, Inc.)" },
              { label: "주문 유형", value: `${priceType} 매수` },
              { label: "수량", value: `${qty || "3"}주` },
              { label: "예상 주문 금액", value: "₩1,119,282" },
              { label: "유언장 검사 결과", value: "제2조 위반 경고 — 무시하고 진행", warn: true },
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-start py-2.5 border-b border-dashed border-border last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-xs font-semibold text-right max-w-[55%] ${warn ? "text-[#B83535]" : "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border p-5 mb-6">
            <p className="text-[9px] font-bold text-muted-foreground mb-4 tracking-[0.2em] uppercase">처리 현황</p>
            <div className="space-y-3">
              {confirmSteps.map(({ label, done, active }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${done ? "bg-[#3D9E72]" : active ? "bg-[#C9A227]" : "bg-muted"}`}>
                    {done ? <CheckCircle size={11} className="text-white" /> : active ? <div className="w-1.5 h-1.5 bg-white animate-pulse" /> : <div className="w-1.5 h-1.5 bg-muted-foreground/20" />}
                  </div>
                  <span className={`text-sm flex-1 text-left ${done ? "text-foreground font-medium" : active ? "text-[#C9A227] font-semibold" : "text-muted-foreground"}`}>{label}</span>
                  {done && <CheckCircle size={11} className="text-[#3D9E72]" />}
                  {active && <div className="flex gap-0.5">{[0, 1, 2].map((j) => <div key={j} className="w-1 h-1 bg-[#C9A227] animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}</div>}
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/trades"
            className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            체결 상태 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 relative">
      {showModal && (
        <WillPrecheckModal
          onClose={() => setShowModal(false)}
          onProceed={() => { setShowModal(false); setStep("confirm"); }}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-2xl font-bold text-foreground">TSLA</h2>
              <span className="text-sm text-muted-foreground">Tesla, Inc.</span>
              <span className="text-[10px] bg-[#FAEAEA] text-[#B83535] px-2 py-0.5 font-black tracking-wider">프리마켓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-foreground">$275.30</span>
              <span className="text-sm font-semibold text-[#B83535]">▼ -8.42 (-2.97%)</span>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            {[
              { label: "1시간 변동", value: "+3.2%", color: "text-[#3D9E72]" },
              { label: "거래량", value: "12.4M", color: "text-foreground" },
              { label: "거래량 스파이크", value: "+230%", color: "text-[#B83535]" },
              { label: "시장 세션", value: "프리마켓", color: "text-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[9px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Chart */}
          <div className="col-span-2">
            <div className="bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">1일 차트 (USD)</span>
                <div className="flex gap-0.5">
                  {["1분", "5분", "15분", "1시간", "1일"].map((t, i) => (
                    <button key={t} className={`text-[10px] px-2.5 py-1 font-medium transition-colors ${
                      i === 2 ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>{t}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={CHART_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B83535" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#B83535" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#6E6A75" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6E6A75" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#1A1720", border: "none", borderRadius: 0, fontSize: 11, padding: "8px 12px" }}
                    labelStyle={{ color: "rgba(245,240,230,0.4)", marginBottom: 2 }}
                    itemStyle={{ color: "#F5F0E6", fontWeight: 600 }}
                    formatter={(v: number) => [`$${v}`, "현재가"]}
                  />
                  <Area type="monotone" dataKey="p" stroke="#B83535" strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: "#B83535" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order panel */}
          <div className="col-span-1">
            <div className="bg-card border border-border p-5">
              <div className="grid grid-cols-2 gap-0.5 bg-muted mb-4">
                {(["매수", "매도"] as Side[]).map((s) => (
                  <button key={s} onClick={() => setSide(s)}
                    className={`py-2.5 text-sm font-bold transition-all ${
                      side === s
                        ? s === "매수" ? "bg-[#3D9E72] text-white" : "bg-[#B83535] text-white"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}>{s}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-0.5 bg-muted mb-4">
                {(["시장가", "지정가"] as PriceType[]).map((pt) => (
                  <button key={pt} onClick={() => setPriceType(pt)}
                    className={`py-1.5 text-xs font-semibold transition-all ${
                      priceType === pt ? "bg-card text-foreground" : "bg-transparent text-muted-foreground"
                    }`}>{pt}</button>
                ))}
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">수량 (주)</label>
                  <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">주문 금액 (예상)</label>
                  <div className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-muted-foreground">
                    {qty ? `₩${amount}` : "—"}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">손절가</label>
                  <input type="text" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="예: $250.00" />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">목표가</label>
                  <input type="text" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="예: $290.00" />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground font-bold block mb-1 uppercase">거래 이유</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none">
                    <option value="">선택하세요</option>
                    <option>가격이 더 오를 것 같아서</option>
                    <option>계획한 진입 구간이라서</option>
                    <option>손실 만회 목적</option>
                    <option>뉴스/이슈 확인 후</option>
                    <option>기타 직접 입력</option>
                  </select>
                </div>
              </div>
              <div className="bg-[#FAEAEA] border-l-4 border-[#B83535] px-3 py-2.5 mb-3 flex items-center gap-2">
                <AlertTriangle size={12} className="text-[#B83535] shrink-0" />
                <p className="text-[10px] text-[#B83535] leading-relaxed font-semibold">
                  유언장 제2조 위반 가능성 감지
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="w-full bg-foreground text-background py-3 text-sm font-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 tracking-wider"
              >
                <Scroll size={13} />
                주문 전 유언장 검사
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/order/page.tsx
git commit -m "feat: replace order page with xorud UI (form + confirm)"
```

---

## Task 11: Trades 페이지 교체

**Files:**
- Modify: `src/app/(dashboard)/trades/page.tsx`

xorud의 PositionScreen + TradeClosedScreen을 `useState<"position" | "closed">` 으로 합친다.

- [ ] **Step 1: 페이지 교체**

`src/app/(dashboard)/trades/page.tsx` 를 아래 내용으로 교체한다:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

type TradeView = "position" | "closed";

export default function TradesPage() {
  const [view, setView] = useState<TradeView>("position");

  if (view === "closed") {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">거래 보고서</h2>
          <div className="grid grid-cols-2 gap-5">
            {[
              {
                ticker: "TSLA", company: "Tesla, Inc.", rate: "-4.3%", tag: "손실",
                color: "#B83535", buyP: "$262.30", sellP: "$251.02",
                buyT: "2026.06.28 09:34", sellT: "2026.06.28 11:46",
                dur: "2시간 12분", btn: "사망진단서 보기", kind: "death",
              },
              {
                ticker: "AAPL", company: "Apple Inc.", rate: "+3.1%", tag: "수익",
                color: "#3D9E72", buyP: "$193.40", sellP: "$199.40",
                buyT: "2026.06.26 10:02", sellT: "2026.06.27 14:18",
                dur: "1일 4시간 16분", btn: "생존보고서 보기", kind: "survival",
              },
            ].map(({ ticker, company, rate, tag, color, buyP, sellP, buyT, sellT, dur, btn, kind }) => (
              <div key={ticker} className="bg-card overflow-hidden" style={{ border: `1px solid ${color}30` }}>
                <div className="px-5 py-4" style={{ background: color }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{ticker}</span>
                    <span className="text-white/60 text-xs">{company}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-white text-3xl font-black">{rate}</span>
                    <span className="text-white/70 text-sm mb-1">{tag} 거래</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-3 mb-4 relative">
                    <div className="absolute left-3 top-4 bottom-4 w-px bg-border" />
                    {[{ label: "매수 체결", value: buyP, time: buyT }, { label: "매도 체결", value: sellP, time: sellT }].map(({ label, value, time }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-foreground flex items-center justify-center text-[9px] font-black text-background shrink-0 z-10">{label[0]}</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{time}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">보유 시간: {dur}</p>
                  <Link
                    href={`/reports?kind=${kind}`}
                    className="w-full py-2.5 text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center"
                    style={{ background: color }}
                  >
                    {btn}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">보유 중 거래 추적</h2>
        <div className="bg-card border border-border p-6 mb-4">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-muted flex items-center justify-center font-black text-sm text-foreground">TSLA</div>
              <div>
                <h3 className="font-bold text-foreground">Tesla, Inc.</h3>
                <p className="text-xs text-muted-foreground">NASDAQ · 2026.06.28 14:32 매수 체결</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-wider text-muted-foreground mb-0.5 uppercase font-bold">현재가</p>
              <p className="text-2xl font-black text-foreground">$271.50</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "평균 매수가", value: "$262.30", color: "" },
              { label: "보유 수량", value: "3주", color: "" },
              { label: "평가 금액", value: "$814.50", color: "" },
              { label: "평가손익", value: "+$27.60", color: "text-[#3D9E72]" },
              { label: "수익률", value: "+3.5%", color: "text-[#3D9E72]" },
              { label: "보유 시간", value: "2시간 14분", color: "" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-muted/40 border border-border/40 p-3">
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">{label}</p>
                <p className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#EBF7F3] border border-[#3D9E72]/20 p-3">
              <p className="text-[9px] text-[#3D9E72] mb-1 font-black tracking-wider uppercase">목표가</p>
              <p className="text-sm font-bold text-[#3D9E72] mb-2">$280.00</p>
              <div className="h-1 bg-[#3D9E72]/15 overflow-hidden">
                <div className="h-full bg-[#3D9E72]" style={{ width: "55%" }} />
              </div>
            </div>
            <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-3">
              <p className="text-[9px] text-[#B83535] mb-1 font-black tracking-wider uppercase">손절가</p>
              <p className="text-sm font-bold text-[#B83535] mb-2">$250.00</p>
              <div className="h-1 bg-[#B83535]/15 overflow-hidden">
                <div className="h-full bg-[#B83535]" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#EBF7F3] border-l-4 border-[#3D9E72] px-5 py-4 mb-5 flex items-start gap-3">
          <CheckCircle size={14} className="text-[#3D9E72] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#2A7A55] mb-0.5">현재 거래는 유언장 제4조를 지키고 있습니다.</p>
            <p className="text-xs text-[#2A7A55]/70">제4조: 목표 수익률과 손절 기준을 먼저 작성한다. — 두 기준 모두 입력됨.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button className="py-3 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">일부 매도</button>
          <button
            onClick={() => setView("closed")}
            className="py-3 bg-[#B83535] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            전량 매도
          </button>
          <button className="py-3 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">손절 기준 수정</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/trades/page.tsx
git commit -m "feat: replace trades page with position + trade-closed views"
```

---

## Task 12: Reports 페이지 교체

**Files:**
- Modify: `src/app/(dashboard)/reports/page.tsx`

서버 async 컴포넌트. `searchParams`(Promise)를 `await`해서 `kind` 값으로 사망진단서 또는 생존보고서 렌더링.

- [ ] **Step 1: 페이지 교체**

`src/app/(dashboard)/reports/page.tsx` 를 아래 내용으로 교체한다:

```tsx
import Link from "next/link";
import { AlertTriangle, CheckCircle, BookOpen } from "lucide-react";
import { OrnamentalDivider, CertStamp, CertSeal } from "@/components/cert-ui";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "death" } = await searchParams;

  if (kind === "survival") {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border-2 border-[#3D9E72]/25 overflow-hidden relative">
            <div className="absolute top-5 right-5 flex flex-col items-end gap-2 pointer-events-none z-10">
              <CertStamp color="#3D9E72" text="생존확인" sub="CERTIFIED" />
              <CertSeal color="#3D9E72" line1="故래소" line2="분석인증" rotate={9} />
            </div>
            <div className="bg-[#1B1B26] px-6 py-5">
              <p className="text-[#3D9E72] text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">Trade Survival Report</p>
              <h2 className="text-white text-xl font-black">AAPL 거래 생존보고서</h2>
              <p className="text-white/40 text-xs mt-1.5">2026년 6월 27일 발행 · 故래소 거래 분석 시스템</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#EBF7F3] border border-[#3D9E72]/20 p-4 text-center">
                  <p className="text-[10px] text-[#3D9E72] font-bold mb-1 uppercase tracking-wide">최종 수익률</p>
                  <p className="text-2xl font-black text-[#3D9E72]">+3.1%</p>
                </div>
                <div className="bg-muted/40 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">보유 시간</p>
                  <p className="text-base font-bold text-foreground">1일 4시간</p>
                </div>
                <div className="bg-muted/40 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">실현 수익</p>
                  <p className="text-base font-bold text-[#3D9E72]">+₩23,820</p>
                </div>
              </div>
              <OrnamentalDivider color="#3D9E72" />
              <div className="mb-5">
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle size={13} className="text-[#3D9E72]" />
                  생존 요인
                </h4>
                <div className="space-y-2">
                  {["지정가로 진입하여 갭 리스크 최소화", "목표 수익률 +3%를 사전에 설정", "목표 도달 후 계획대로 매도 실행"].map((factor, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#EBF7F3] border border-[#3D9E72]/10 px-4 py-2.5">
                      <span className="w-5 h-5 bg-[#3D9E72] flex items-center justify-center shrink-0">
                        <CheckCircle size={11} className="text-white" />
                      </span>
                      <span className="text-sm text-foreground">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
              <OrnamentalDivider color="#C9A227" />
              <div className="bg-[#FDF8EC] border border-[#C9A227]/35 px-4 py-3.5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={12} className="text-[#C9A227]" />
                  <span className="text-[11px] font-bold text-[#7A5F0E] tracking-wide">준수한 유언장 조항</span>
                </div>
                <p className="text-sm text-foreground font-semibold">&ldquo;제4조. 목표 수익률을 정하고 거래한다.&rdquo;</p>
              </div>
              <div className="bg-muted/30 border border-border px-4 py-3.5 mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-foreground">신규 유언장 조항 제안</span>
                  <span className="text-[10px] bg-[#C9A227]/10 text-[#7A5F0E] px-2 py-0.5 font-bold">분석 제안</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  &ldquo;나는 수익 구간에서도 목표가에 도달하면 일부라도 실현한다.&rdquo;
                </p>
              </div>
              <OrnamentalDivider color="#3D9E72" />
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">발행인</p>
                  <p className="text-xs font-semibold text-foreground">故래소 거래 분석 시스템</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">2026년 6월 27일</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">확인자 서명</p>
                  <div className="w-36 border-b border-foreground/20 mb-1" />
                  <p className="text-[9px] text-muted-foreground">김주식 (본인)</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/will" className="py-2.5 bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center">
                  유언장에 추가
                </Link>
                <button className="py-2.5 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">수정하기</button>
                <button className="py-2.5 border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">버리기</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: death certificate
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border-2 border-[#B83535]/25 overflow-hidden relative">
          <div className="absolute top-5 right-5 flex flex-col items-end gap-2 pointer-events-none z-10">
            <CertStamp color="#B83535" text="사망확인" sub="CONFIRMED" />
            <CertSeal color="#B83535" line1="故래소" line2="분석인증" rotate={9} />
          </div>
          <div className="bg-[#1B1B26] px-6 py-5">
            <p className="text-[#B83535] text-[10px] font-bold tracking-[0.2em] uppercase mb-1.5">Trade Death Certificate</p>
            <h2 className="text-white text-xl font-black">故 TSLA 거래 사망진단서</h2>
            <p className="text-white/40 text-xs mt-1.5">2026년 6월 28일 발행 · 故래소 거래 분석 시스템</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[#FAEAEA] border border-[#B83535]/20 p-4 text-center">
                <p className="text-[10px] text-[#B83535] font-bold mb-1 uppercase tracking-wide">최종 수익률</p>
                <p className="text-2xl font-black text-[#B83535]">-4.3%</p>
              </div>
              <div className="bg-muted/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">보유 시간</p>
                <p className="text-base font-bold text-foreground">2시간 12분</p>
              </div>
              <div className="bg-muted/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wide">실현 손익</p>
                <p className="text-base font-bold text-[#B83535]">-₩41,700</p>
              </div>
            </div>
            <OrnamentalDivider color="#B83535" />
            <div className="mb-5">
              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle size={13} className="text-[#B83535]" />
                사망 원인
              </h4>
              <div className="space-y-2">
                {["프리마켓 갭상 직후 시장가 매수", "손절 기준 없이 진입", "가격 급등 후 감정적 반복 조회"].map((cause, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#FAEAEA] border border-[#B83535]/10 px-4 py-2.5">
                    <span className="w-5 h-5 bg-[#B83535] flex items-center justify-center text-white text-[10px] font-black shrink-0">{i + 1}</span>
                    <span className="text-sm text-foreground">{cause}</span>
                  </div>
                ))}
              </div>
            </div>
            <OrnamentalDivider color="#C9A227" />
            <div className="bg-[#FDF8EC] border border-[#C9A227]/35 px-4 py-3.5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={12} className="text-[#C9A227]" />
                <span className="text-[11px] font-bold text-[#7A5F0E] tracking-wide">위반한 유언장 조항</span>
              </div>
              <p className="text-sm text-foreground font-semibold">&ldquo;제2조. 프리마켓 갭상 직후 매수 금지&rdquo;</p>
            </div>
            <div className="bg-muted/30 border border-border px-4 py-3.5 mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">신규 유언장 조항 제안</span>
                <span className="text-[10px] bg-[#C9A227]/10 text-[#7A5F0E] px-2 py-0.5 font-bold">분석 제안</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                &ldquo;나는 프리마켓에서 전일 종가 대비 +5% 이상 오른 종목을 시장가로 매수하지 않는다.&rdquo;
              </p>
            </div>
            <OrnamentalDivider color="#B83535" />
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">발행인</p>
                <p className="text-xs font-semibold text-foreground">故래소 거래 분석 시스템</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">2026년 6월 28일</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">확인자 서명</p>
                <div className="w-36 border-b border-foreground/20 mb-1" />
                <p className="text-[9px] text-muted-foreground">김주식 (본인)</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/will" className="py-2.5 bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center">
                유언장에 추가
              </Link>
              <button className="py-2.5 border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">수정하기</button>
              <button className="py-2.5 border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">버리기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/reports/page.tsx
git commit -m "feat: replace reports page with death cert + survival report"
```

---

## Task 13: Will 페이지 교체

**Files:**
- Modify: `src/app/(dashboard)/will/page.tsx`

- [ ] **Step 1: 페이지 교체**

`src/app/(dashboard)/will/page.tsx` 를 아래 내용으로 교체한다:

```tsx
import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { OrnamentalDivider, CertSeal } from "@/components/cert-ui";
import { MY_WILL_DATA } from "@/lib/mock-data";

export default function WillPage() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">나의 투자 유언장</h2>
            <p className="text-sm text-muted-foreground mt-1">총 5개 조항 · 마지막 업데이트: 2026.06.28</p>
          </div>
          <button className="flex items-center gap-2 bg-[#FDF8EC] border border-[#C9A227]/40 text-[#7A5F0E] px-4 py-2 text-sm font-bold hover:bg-[#F5EDD0] transition-colors">
            <Plus size={13} />
            새 조항 추가
          </button>
        </div>

        <div className="border border-[#C9A227]/40 p-0.5">
          <div className="border border-[#C9A227]/20 bg-[#FDFAF6]">
            {/* Header */}
            <div className="relative px-10 pt-8 pb-6 text-center" style={{ borderBottom: "2px double rgba(201,162,39,0.2)" }}>
              <div className="absolute top-5 right-7">
                <CertSeal color="#C9A227" line1="투자자" line2="유언장" rotate={-8} />
              </div>
              <p className="text-[9px] font-black tracking-[0.4em] text-[#C9A227] uppercase mb-3">투자자 공식 유언장</p>
              <h2 className="text-2xl font-black text-foreground tracking-[0.15em] mb-1">
                투 자 유 언 장
              </h2>
              <OrnamentalDivider />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                나, 김주식은 투자자로서 아래와 같은 원칙을 스스로에게 선언하며,<br />
                이를 매 거래 전 유언장으로써 읽고 준수할 것을 엄숙히 서약합니다.
              </p>
              <div className="mt-3 text-[10px] text-muted-foreground">
                작성일: 2026년 6월 28일 &nbsp;·&nbsp; 서약자: 김주식
              </div>
            </div>

            {/* Articles */}
            <div className="px-10 py-4">
              {MY_WILL_DATA.map(({ id, art, text, source, violations, lastDate }, i) => (
                <div key={id}>
                  <div className="flex items-start gap-5 py-4">
                    <span className="text-[11px] font-black text-[#C9A227] tracking-wider w-12 shrink-0 pt-0.5">{art}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed mb-1.5">{text}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-[9px] text-muted-foreground tracking-wide">출처: {source}</span>
                        <span className={`text-[9px] font-black tracking-wider ${violations > 0 ? "text-[#B83535]" : "text-[#3D9E72]"}`}>
                          {violations > 0 ? `위반 ${violations}회` : "위반 없음"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">마지막 위반: {lastDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted">
                        <Edit2 size={12} />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-[#B83535] transition-colors hover:bg-muted">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {i < MY_WILL_DATA.length - 1 && (
                    <div className="border-b border-dashed border-foreground/10" />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-10 py-6" style={{ borderTop: "2px double rgba(201,162,39,0.2)" }}>
              <OrnamentalDivider />
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-[9px] tracking-wider text-muted-foreground mb-1 uppercase font-bold">서약자 서명</p>
                  <div className="w-40 border-b border-foreground/20 mb-1" />
                  <p className="text-[9px] text-muted-foreground">김주식 · 2026년 6월 28일</p>
                </div>
                <p className="text-[9px] text-muted-foreground/50 text-right max-w-xs leading-relaxed">
                  이 유언장은 주문 전마다 자동으로 낭독됩니다.<br />
                  故래소 거래 분석 시스템 보관
                </p>
              </div>
              <div className="mt-5 flex justify-end">
                <Link href="/dashboard" className="text-xs font-bold text-[#7A5F0E] hover:underline underline-offset-2 tracking-wide">
                  홈으로 돌아가기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/will/page.tsx
git commit -m "feat: replace will page with My Will UI"
```

---

## Task 14: 최종 빌드 + 네비게이션 검증

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 전체 빌드**

```bash
npm run build
```

Expected: `✓ Compiled successfully` — 에러 및 타입 오류 없음

- [ ] **Step 2: lint 검사**

```bash
npm run lint
```

Expected: 경고/오류 없음. 있으면 해당 파일에서 수정.

- [ ] **Step 3: 최종 커밋**

```bash
git add docs/superpowers/plans/2026-06-28-xorud-ui-migration.md
git commit -m "docs: add xorud UI migration implementation plan"
```

---

## 완료 기준

- [ ] `npm run build` 통과
- [ ] `/` Landing 화면 렌더링 (故래소 타이틀, 3개 특징, CTA 버튼)
- [ ] `/connect` 계좌 연동 화면
- [ ] `/will/setup` 첫 유언장 작성 (체크박스 토글 작동)
- [ ] `/dashboard` 홈 (사이드바 + 요약 카드 + 경고 + 보고서 표)
- [ ] `/order` 주문 폼 → precheck 모달 → 주문 접수 화면 전환
- [ ] `/trades` 포지션 → 전량 매도 → 거래 종료 화면 전환
- [ ] `/reports?kind=death` 사망진단서, `/reports?kind=survival` 생존보고서
- [ ] `/will` 유언장 조항 목록
- [ ] 사이드바 active 상태 정확 (현재 경로 하이라이트)
