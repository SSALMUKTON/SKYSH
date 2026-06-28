import type { Market, RuleType, Side, OrderType } from "@prisma/client";

/** precheck 대상 주문 (DB 저장 전 형태). */
export interface OrderDraft {
  market: Market;
  symbol: string;
  side: Side;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number; // 손절 기준 (NO_STOP_LOSS 검사)
}

/** 검사에 사용할 시장 데이터 (브로커 getQuote 결과에서 구성). */
export interface MarketData {
  price: number;
  prevClose: number;
  changePct: number; // 등락률(%)
  volume: number;
  isPremarket?: boolean;
}

/** 평가에 사용할 조항 (룰 + 파라미터). Clause 에서 추려낸 형태. */
export interface ClauseRule {
  id: string;
  ruleType: RuleType;
  params: Record<string, unknown>;
  displayText: string;
}

/** 위반 시 사용자에게 제시할 선택지 (낭독 모달 버튼). */
export type SuggestedAction =
  | "postpone" // 미루기 (10분 뒤 다시)
  | "switch_limit" // 지정가로 변경
  | "reduce_amount" // 금액 줄이기
  | "set_stop_loss" // 손절 기준 작성
  | "force"; // 그래도 주문

/** 단일 조항 위반 결과. */
export interface Violation {
  clauseId: string;
  ruleType: RuleType;
  message: string; // 낭독 모달에 보여줄 경고 문구
  severity: "block" | "warn"; // block: 강행 사유 필요 · warn: 주의
  actions: SuggestedAction[]; // 제시할 선택지
}

/** precheck 종합 결과. */
export interface PrecheckResult {
  ok: boolean; // 위반 없음
  violations: Violation[];
}
