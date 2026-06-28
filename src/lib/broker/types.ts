import type { Side, PriceType } from "@prisma/client";

export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
}

export interface Quote {
  symbol: string;
  price: number; // 현재가
  prevClose: number; // 전일 종가
  asOf: Date;
}

export interface PlaceOrderInput {
  accountNo: string;
  symbol: string;
  side: Side;
  priceType: PriceType;
  qty: number;
  price?: number; // 지정가(LIMIT)일 때
}

export interface PlaceOrderResult {
  kisOrderId: string;
  acceptedQty: number;
  raw?: unknown; // 증권사 원본 응답
}

/**
 * 증권사 연동 추상 인터페이스. [owner: P1]
 * MockBroker / KisBroker 가 이를 구현하며, 상위 코드는 getBroker() 만 의존한다.
 * 이 인터페이스가 P1 과 나머지 팀의 계약선이다 — 시그니처 변경 시 공유할 것.
 */
export interface Broker {
  /** KIS access token 발급/캐시 (24h). */
  getAccessToken(): Promise<TokenInfo>;
  /** 현재가 조회. */
  getQuote(symbol: string): Promise<Quote>;
  /** 주문 전송. */
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;
}
