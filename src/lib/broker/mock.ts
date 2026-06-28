import type { Market, OrderStatus } from "@prisma/client";
import type {
  Balance,
  Broker,
  Fill,
  OrderAck,
  PlaceOrderInput,
  Quote,
} from "./types";

/**
 * 개발용 Mock broker. [owner: P1 — 체결/거부/위반-트리거 시나리오 확장]
 * KIS/Upbit 키 없이도 프론트(P2)·규칙엔진(P4)이 전 구간을 붙여볼 수 있도록
 * 결정적(deterministic) 가짜 데이터를 반환한다.
 *
 * 팁(P4): symbol 에 "SURGE" 가 들어가면 changePct=+18 로 급등을 흉내내
 *         CHASE_SURGE 위반을 강제로 트리거할 수 있다.
 */
export class MockBroker implements Broker {
  async getQuote(market: Market, symbol: string): Promise<Quote> {
    const base = Number(symbol.replace(/\D/g, "")) % 100000 || 50000;
    const changePct = symbol.toUpperCase().includes("SURGE") ? 18 : 1.2;
    return {
      market,
      symbol,
      price: base,
      prevClose: Math.round(base / (1 + changePct / 100)),
      changePct,
      volume: 1_000_000,
      isPremarket: false,
      asOf: new Date(),
    };
  }

  async placeOrder(input: PlaceOrderInput): Promise<OrderAck> {
    return {
      brokerOrderId: `mock-${input.side}-${input.symbol}-${input.quantity}`,
      status: "FILLED" as OrderStatus,
    };
  }

  async getFill(brokerOrderId: string): Promise<Fill> {
    return {
      brokerOrderId,
      filledPrice: 50000,
      filledQty: 1,
      status: "FILLED" as OrderStatus,
    };
  }

  async getBalance(market: Market): Promise<Balance> {
    return { market, cash: 10_000_000, positions: [] };
  }
}
