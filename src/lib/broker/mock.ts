import type { Market, OrderStatus } from "@prisma/client";
import { latestQuote } from "@/lib/data/prices";
import type {
  Balance,
  Broker,
  Fill,
  OrderAck,
  PlaceOrderInput,
  Quote,
} from "./types";

/**
 * 개발용 Mock broker. [owner: P1]
 * KIS/Upbit 키 없이도 전 구간(P2 프론트·P4 규칙엔진)이 붙어 돌도록 결정적 데이터를 반환한다.
 * 현재가/등락률/거래량은 캐싱된 과거 일봉(`data/`)의 "마지막 거래일" 값에서 끌어와
 * 실제와 유사하게 만든다(없으면 합성값으로 폴백).
 *
 * 위반 강제 트리거(P4 테스트용):
 *   symbol 에 "SURGE" 가 들어가면 changePct=+18 로 급등을 흉내내 CHASE_SURGE 위반을 강제.
 */
export class MockBroker implements Broker {
  async getQuote(market: Market, symbol: string): Promise<Quote> {
    const forced = symbol.toUpperCase().includes("SURGE");
    const q = await latestQuote(market, symbol);

    if (q && !forced) {
      return {
        market,
        symbol,
        price: q.price,
        prevClose: q.prevClose,
        changePct: q.changePct,
        volume: q.volume,
        isPremarket: false,
        asOf: new Date(`${q.asOf}T00:00:00Z`),
      };
    }

    // 캐싱 데이터가 없거나 위반 강제 시: 결정적 합성값.
    const base = q?.price ?? (Number(symbol.replace(/\D/g, "")) % 100000 || 50000);
    const changePct = forced ? 18 : (q?.changePct ?? 1.2);
    return {
      market,
      symbol,
      price: base,
      prevClose: Math.round(base / (1 + changePct / 100)),
      changePct,
      volume: q?.volume ?? 1_000_000,
      isPremarket: false,
      asOf: new Date(),
    };
  }

  async placeOrder(input: PlaceOrderInput): Promise<OrderAck> {
    // 체결가: 지정가는 입력가, 시장가는 현재가. getFill 이 복원할 수 있게 id 에 인코딩.
    let fillPrice = input.price ?? 0;
    if (input.orderType === "MARKET" || !fillPrice) {
      const q = await this.getQuote(input.market, input.symbol);
      fillPrice = q.price;
    }
    const id = ["mock", input.side, input.market, input.symbol, input.quantity, fillPrice].join(
      "|",
    );
    return { brokerOrderId: id, status: "FILLED" as OrderStatus };
  }

  async getFill(brokerOrderId: string): Promise<Fill> {
    // placeOrder 가 인코딩한 [_, side, market, symbol, qty, price]
    const parts = brokerOrderId.split("|");
    const filledQty = Number(parts[4]) || 1;
    const filledPrice = Number(parts[5]) || 0;
    return {
      brokerOrderId,
      filledPrice,
      filledQty,
      status: "FILLED" as OrderStatus,
    };
  }

  async getBalance(market: Market): Promise<Balance> {
    return { market, cash: 10_000_000, positions: [] };
  }
}
