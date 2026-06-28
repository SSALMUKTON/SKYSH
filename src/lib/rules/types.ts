import type { RuleType, Side, PriceType } from "@prisma/client";

/** precheck 대상 주문 (DB 저장 전 형태). */
export interface OrderDraft {
  symbol: string;
  side: Side;
  priceType: PriceType;
  qty: number;
  price?: number;
}

/** 평가에 사용할 조항 (룰 + 파라미터). WillClause 에서 추려낸 형태. */
export interface ClauseRule {
  id: string;
  ruleType: RuleType;
  params: Record<string, unknown>;
  displayText: string;
}

/** 단일 조항 위반 결과. */
export interface Violation {
  clauseId: string;
  ruleType: RuleType;
  message: string; // 사용자에게 보여줄 경고 문구
  severity: "block" | "warn"; // block: 강행 사유 필요 · warn: 주의
}

/** precheck 종합 결과. */
export interface PrecheckResult {
  ok: boolean; // 위반 없음
  violations: Violation[];
}

/** 룰 평가에 필요한 외부 상태(현재가·보유수량 등). P4 가 확장. */
export interface EvalContext {
  currentPrice?: number;
  heldQty?: number;
  [key: string]: unknown;
}
