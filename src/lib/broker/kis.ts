import type {
  Broker,
  PlaceOrderInput,
  PlaceOrderResult,
  Quote,
  TokenInfo,
} from "./types";

export interface KisConfig {
  appKey: string;
  appSecret: string;
  baseUrl: string;
}

/**
 * 한국투자증권(KIS) Developers 실제 연동. [owner: P1]
 * REST(OAuth 토큰) + 시세/주문 API. 토큰은 24h 캐시(BrokerAccount.kisTokenCache).
 *
 * TODO(P1): 아래 메서드를 KIS REST 호출로 구현.
 *   - getAccessToken: POST /oauth2/tokenP
 *   - getQuote:       GET  /uapi/domestic-stock/v1/quotations/inquire-price
 *   - placeOrder:     POST /uapi/domestic-stock/v1/trading/order-cash
 */
export class KisBroker implements Broker {
  constructor(private readonly config: KisConfig) {}

  async getAccessToken(): Promise<TokenInfo> {
    throw new Error(
      `not implemented — P1 (KIS getAccessToken @ ${this.config.baseUrl})`,
    );
  }

  async getQuote(symbol: string): Promise<Quote> {
    throw new Error(`not implemented — P1 (KIS getQuote: ${symbol})`);
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    throw new Error(`not implemented — P1 (KIS placeOrder: ${input.symbol})`);
  }
}
