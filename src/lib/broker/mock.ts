import type {
  Broker,
  PlaceOrderInput,
  PlaceOrderResult,
  Quote,
  TokenInfo,
} from "./types";

/**
 * 개발용 Mock broker. [owner: P1 — 체결/거부 시뮬레이션 등 확장]
 * KIS 키 없이도 프론트(P2)·규칙엔진(P4)이 흐름을 붙여볼 수 있도록
 * 결정적(deterministic) 가짜 데이터를 반환한다.
 */
export class MockBroker implements Broker {
  async getAccessToken(): Promise<TokenInfo> {
    return {
      accessToken: "mock-access-token",
      expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
    };
  }

  async getQuote(symbol: string): Promise<Quote> {
    // 종목코드 숫자를 가격처럼 보이게 만든 결정적 더미값.
    const base = Number(symbol.replace(/\D/g, "")) % 100000 || 50000;
    return { symbol, price: base, prevClose: base, asOf: new Date() };
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    return {
      kisOrderId: `mock-${input.side}-${input.symbol}-${input.qty}`,
      acceptedQty: input.qty,
    };
  }
}
