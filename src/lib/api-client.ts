/**
 * 프론트(P2)용 얇은 API 클라이언트. [owner: P2]
 *
 * 각 함수는 실제 API 를 호출하되, 아직 stub(501)이거나 네트워크 오류면
 * 클라이언트 목 데이터로 폴백한다. 의존 API(P1/P4)가 완성되면 코드 수정 없이
 * 자동으로 실 API 경로로 전환된다.
 *
 * 반환은 { data, mocked } 형태 — mocked=true 면 폴백이 동작한 것(개발용 배지에 사용).
 */
import type { Market, ReportKind } from "@prisma/client";
import type { Quote } from "@/lib/broker/types";
import type { OrderDraft, PrecheckResult, Violation } from "@/lib/rules/types";

export interface ExecuteResult {
  orderId: string;
  brokerOrderId: string;
  status: "PENDING" | "FILLED" | "CANCELLED";
  tradeId?: string;
}

/**
 * 프론트 표시용 거래 뷰모델. (DB Trade 는 Decimal/Date 라 JSON 직렬화가 지저분 →
 * 화면용으로 number/string 으로 정돈한 형태. P1 의 GET /api/trades 가 완성되면
 * 응답을 이 모양으로 매핑하는 어댑터만 보강하면 된다.)
 */
export interface TradeDTO {
  id: string;
  market: Market;
  symbol: string;
  company?: string;
  status: "OPEN" | "CLOSED";
  entryPrice: number;
  entryQty: number;
  entryAt: string; // ISO
  currentPrice?: number; // OPEN
  exitPrice?: number; // CLOSED
  exitAt?: string;
  pnlPct?: number;
  holdDurationMin?: number;
  stopPrice?: number;
  targetPrice?: number;
}

export interface SuggestionDTO {
  id: string;
  displayText: string;
  rationale?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/** 프론트 표시용 보고서 뷰모델 (P3 GeneratedReport + Trade 요약을 정돈). */
export interface ReportDTO {
  tradeId: string;
  symbol: string;
  kind: ReportKind; // DEATH | SURVIVAL
  pnlPct: number;
  holdDurationMin: number;
  realizedKrw: number;
  causes: string[]; // 사망/생존 원인
  keptOrViolatedClause: string; // 지킨(생존) / 위반(사망) 조항 문구
  suggestion: SuggestionDTO; // 새 조항 제안
}

export interface ApiResult<T> {
  data: T;
  mocked: boolean;
}

/** localStorage 의 broker 자격증명을 Authorization 헤더로 (있을 때만). */
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem("broker_creds");
  return raw ? { Authorization: `Bearer ${raw}` } : {};
}

// ─── Mock 데이터 (폴백) ─────────────────────────────────────────────

/** 위반을 유발하도록 설계된 결정론적 시세 (TSLA 프리마켓, 급등). */
export const MOCK_QUOTE: Quote = {
  market: "US",
  symbol: "TSLA",
  price: 275.3,
  prevClose: 238.5,
  changePct: 15.4, // CHASE_SURGE 유발 (>= 15)
  volume: 12_400_000,
  isPremarket: true,
  asOf: new Date(),
};

/**
 * client-side 룰체크 — P4 engine.ts 가이드와 동일 로직. 폼 입력에 반응한다.
 *  - NO_STOP_LOSS: BUY 인데 stopPrice 미입력 → 위반
 *  - CHASE_SURGE : 시세 급등(>=15%) + 시장가 매수 → 위반
 */
export function mockPrecheck(draft: OrderDraft, quote: Quote): PrecheckResult {
  const violations: Violation[] = [];

  if (draft.side === "BUY" && draft.stopPrice == null) {
    violations.push({
      clauseId: "mock-no-stop-loss",
      ruleType: "NO_STOP_LOSS",
      message: "나는 손절 기준 없는 거래는 시작하지 않는다.",
      severity: "block",
      actions: ["set_stop_loss", "force"],
    });
  }

  if (draft.side === "BUY" && draft.orderType === "MARKET" && quote.changePct >= 15) {
    violations.push({
      clauseId: "mock-chase-surge",
      ruleType: "CHASE_SURGE",
      message: "나는 급등 직후(+15% 이상) 시장가로 추격 매수하지 않는다.",
      severity: "block",
      actions: ["postpone", "switch_limit", "reduce_amount", "force"],
    });
  }

  return { ok: violations.length === 0, violations };
}

// ─── API 함수 ───────────────────────────────────────────────────────

/** 현재가/등락률 조회. 실패 시 MOCK_QUOTE. */
export async function getQuote(
  market: Market,
  symbol: string,
): Promise<ApiResult<Quote>> {
  try {
    const res = await fetch(
      `/api/market/quote?market=${market}&symbol=${encodeURIComponent(symbol)}`,
      { headers: authHeaders() },
    );
    if (!res.ok) throw new Error(`quote ${res.status}`);
    const raw = await res.json();
    return { data: { ...raw, asOf: new Date(raw.asOf) } as Quote, mocked: false };
  } catch {
    return { data: { ...MOCK_QUOTE, symbol, market }, mocked: true };
  }
}

/** 주문 전 검사. 실패 시 client-side mock 룰체크. */
export async function precheck(
  draft: OrderDraft,
  quote: Quote,
): Promise<ApiResult<PrecheckResult>> {
  try {
    const res = await fetch("/api/order/precheck", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error(`precheck ${res.status}`);
    return { data: (await res.json()) as PrecheckResult, mocked: false };
  } catch {
    return { data: mockPrecheck(draft, quote), mocked: true };
  }
}

/** 주문 실행(강행 포함). 실패 시 mock 접수 ack. */
export async function execute(
  draft: OrderDraft,
  forceReason?: string,
  willViolations?: Violation[],
): Promise<ApiResult<ExecuteResult>> {
  try {
    const res = await fetch("/api/order/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ ...draft, forceReason, willViolations }),
    });
    if (!res.ok) throw new Error(`execute ${res.status}`);
    return { data: (await res.json()) as ExecuteResult, mocked: false };
  } catch {
    return {
      data: {
        orderId: "mock-order",
        brokerOrderId: "mock-broker-order",
        status: "PENDING",
      },
      mocked: true,
    };
  }
}

// ─── 거래(보유/청산) ────────────────────────────────────────────────

const now = Date.now();
const iso = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();

/** 폴백용 거래 목록: 보유 중 1건(TSLA) + 청산 1건(AAPL). */
export const MOCK_TRADES: TradeDTO[] = [
  {
    id: "t-open-tsla",
    market: "US",
    symbol: "TSLA",
    company: "Tesla, Inc.",
    status: "OPEN",
    entryPrice: 262.3,
    entryQty: 3,
    entryAt: iso(134),
    currentPrice: 271.5,
    pnlPct: 3.5,
    holdDurationMin: 134,
    stopPrice: 250,
    targetPrice: 280,
  },
  {
    id: "t-closed-aapl",
    market: "US",
    symbol: "AAPL",
    company: "Apple Inc.",
    status: "CLOSED",
    entryPrice: 193.4,
    entryQty: 5,
    entryAt: iso(1696 + 1696),
    exitPrice: 199.4,
    exitAt: iso(10),
    pnlPct: 3.1,
    holdDurationMin: 1696,
  },
];

/** 거래 목록 조회. 실패 시 MOCK_TRADES. */
export async function getTrades(): Promise<ApiResult<TradeDTO[]>> {
  try {
    const res = await fetch("/api/trades", { headers: authHeaders() });
    if (!res.ok) throw new Error(`trades ${res.status}`);
    const raw = await res.json();
    return { data: (raw.trades ?? raw) as TradeDTO[], mocked: false };
  } catch {
    return { data: MOCK_TRADES, mocked: true };
  }
}

/**
 * 보유 거래 매도 → 청산. 내부적으로 execute(SELL) 호출. 청산된 tradeId 를 돌려준다.
 * (매도가 보고서 트리거 — 호출부는 이 tradeId 로 /reports 로 이동.)
 */
export async function sellTrade(
  trade: TradeDTO,
  quantity?: number,
): Promise<ApiResult<{ tradeId: string }>> {
  const draft: OrderDraft = {
    market: trade.market,
    symbol: trade.symbol,
    side: "SELL",
    orderType: "MARKET",
    quantity: quantity ?? trade.entryQty,
  };
  const { mocked } = await execute(draft);
  return { data: { tradeId: trade.id }, mocked };
}

// ─── 보고서(사망/생존) ──────────────────────────────────────────────

/** 폴백용 보고서: tradeId 별 사망/생존 예시. */
const MOCK_REPORTS: Record<string, ReportDTO> = {
  "t-open-tsla": {
    tradeId: "t-open-tsla",
    symbol: "TSLA",
    kind: "DEATH",
    pnlPct: -4.3,
    holdDurationMin: 132,
    realizedKrw: -41_700,
    causes: [
      "프리마켓 갭상 직후 시장가 매수",
      "손절 기준 없이 진입",
      "가격 급등 후 감정적 반복 조회",
    ],
    keptOrViolatedClause: "제2조. 프리마켓 갭상 직후 매수 금지",
    suggestion: {
      id: "s-tsla",
      displayText: "나는 프리마켓에서 전일 종가 대비 +5% 이상 오른 종목을 시장가로 매수하지 않는다.",
      rationale: "동일 패턴 거래 3회 중 2회 손실.",
      status: "PENDING",
    },
  },
  "t-closed-aapl": {
    tradeId: "t-closed-aapl",
    symbol: "AAPL",
    kind: "SURVIVAL",
    pnlPct: 3.1,
    holdDurationMin: 1696,
    realizedKrw: 23_820,
    causes: [
      "지정가로 진입하여 갭 리스크 최소화",
      "목표 수익률 +3%를 사전에 설정",
      "목표 도달 후 계획대로 매도 실행",
    ],
    keptOrViolatedClause: "제4조. 목표 수익률을 정하고 거래한다.",
    suggestion: {
      id: "s-aapl",
      displayText: "나는 수익 구간에서도 목표가에 도달하면 일부라도 실현한다.",
      rationale: "목표 도달 후 실현이 수익을 지킨 핵심.",
      status: "PENDING",
    },
  },
};

/** 거래 1건의 보고서 조회/생성. 실패 시 mock 보고서(없으면 DEATH 기본). */
export async function getReport(tradeId: string): Promise<ApiResult<ReportDTO>> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ tradeId }),
    });
    if (!res.ok) throw new Error(`reports ${res.status}`);
    return { data: (await res.json()) as ReportDTO, mocked: false };
  } catch {
    return { data: MOCK_REPORTS[tradeId] ?? MOCK_REPORTS["t-open-tsla"], mocked: true };
  }
}

/**
 * 조항 제안 승인/버리기. 승인 적용 로직은 P4(조항 갱신) 담당 — 엔드포인트 확정 전까지는
 * mock 성공으로 처리하고 UI 에 반영. 실 엔드포인트 생기면 이 함수만 배선하면 된다.
 */
export async function decideSuggestion(
  suggestionId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<ApiResult<{ ok: true }>> {
  void suggestionId;
  void decision;
  return { data: { ok: true }, mocked: true };
}
