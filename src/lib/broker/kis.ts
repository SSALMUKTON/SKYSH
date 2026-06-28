import type { Market } from "@prisma/client";
import type {
  Balance,
  Broker,
  BrokerCredentials,
  Fill,
  OrderAck,
  PlaceOrderInput,
  Quote,
} from "./types";

/**
 * 한국투자증권(KIS) Developers 실제 연동. [owner: P1]
 * REST(OAuth 토큰) + 시세/주문 API. 보안 설계상 자격증명은 요청마다 주입받고
 * 서버에 저장하지 않는다(spec.md). 토큰은 호출 컨텍스트 내에서만 사용.
 *
 * TODO(P1): KIS REST 호출로 구현.
 *   - getQuote:   GET  /uapi/domestic-stock/v1/quotations/inquire-price
 *   - placeOrder: POST /uapi/domestic-stock/v1/trading/order-cash
 *   - getFill:    GET  /uapi/domestic-stock/v1/trading/inquire-ccnl
 *   - getBalance: GET  /uapi/domestic-stock/v1/trading/inquire-balance
 *   해외주식(US)은 overseas-stock 엔드포인트 사용.
 */
export class KisBroker implements Broker {
  constructor(private readonly creds: BrokerCredentials) {}

  async getQuote(market: Market, symbol: string): Promise<Quote> {
    throw new Error(`not implemented — P1 (KIS getQuote: ${market}/${symbol})`);
  }

  async placeOrder(input: PlaceOrderInput): Promise<OrderAck> {
    throw new Error(`not implemented — P1 (KIS placeOrder: ${input.symbol})`);
  }

  async getFill(brokerOrderId: string): Promise<Fill> {
    throw new Error(`not implemented — P1 (KIS getFill: ${brokerOrderId})`);
  }

  async getBalance(market: Market): Promise<Balance> {
    throw new Error(
      `not implemented — P1 (KIS getBalance: ${market}, acct ${this.creds.accountNo ?? "?"})`,
    );
  }
}
