import { z } from "zod";

/**
 * 주문 입력 검증 스키마. [owner: P1]
 * precheck/execute 가 공유. 프론트(P2)가 보내는 주문 초안의 계약선.
 */
export const orderDraftSchema = z.object({
  market: z.enum(["KR", "US", "COIN"]),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["LIMIT", "MARKET"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(), // 지정가
  stopPrice: z.number().positive().optional(), // 손절 기준
  thesis: z.string().optional(), // 매수 이유
});

export type OrderDraftInput = z.infer<typeof orderDraftSchema>;

/** execute 전용: 강행 사유 + precheck 위반 스냅샷을 함께 받는다. */
export const executeSchema = orderDraftSchema.extend({
  forceReason: z.string().optional(),
  willViolations: z.unknown().optional(),
});

export type ExecuteInput = z.infer<typeof executeSchema>;
