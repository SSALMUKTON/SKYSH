import type { Market, Side, OrderType, OrderStatus } from "@prisma/client";

/**
 * 증권사/거래소 자격증명. spec.md 보안 설계상 서버에 저장하지 않고
 * 클라이언트 localStorage 에서 요청마다 전달받아 중계에만 사용한다.
 */
export interface BrokerCredentials {
  apiKey: string;
  apiSecret?: string;
  accountNo?: string;
}

export interface Quote {
  market: Market;
  symbol: string;
  price: number; // 현재가
  prevClose: number; // 전일(또는 기준) 종가
  changePct: number; // 등락률(%)
  volume: number; // 거래량
  isPremarket?: boolean; // 프리마켓 여부
  asOf: Date;
}

export interface PlaceOrderInput {
  market: Market;
  symbol: string;
  side: Side;
  orderType: OrderType;
  quantity: number;
  price?: number; // 지정가(LIMIT)일 때
}

export interface OrderAck {
  brokerOrderId: string;
  status: OrderStatus;
}

export interface Fill {
  brokerOrderId: string;
  filledPrice: number;
  filledQty: number;
  status: OrderStatus;
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export interface Balance {
  market: Market;
  cash: number; // 예수금/가용 금액
  positions: Position[];
}

/**
 * 증권사/거래소 연동 추상 인터페이스. [owner: P1]
 * MockBroker / KisBroker(+추후 UpbitBroker) 가 구현. 상위 코드는 getBroker() 만 의존.
 * 이 인터페이스가 P1 과 나머지 팀의 계약선이다 — 시그니처 변경 시 공유할 것.
 */
export interface Broker {
  /** 현재가(등락률·거래량 포함) 조회. */
  getQuote(market: Market, symbol: string): Promise<Quote>;
  /** 주문 전송. */
  placeOrder(input: PlaceOrderInput): Promise<OrderAck>;
  /** 체결 결과 조회. */
  getFill(brokerOrderId: string): Promise<Fill>;
  /** 잔고/보유 종목 조회. */
  getBalance(market: Market): Promise<Balance>;
}
