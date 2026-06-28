import type { Broker } from "./types";
import { MockBroker } from "./mock";
import { KisBroker } from "./kis";

/**
 * 환경변수 BROKER_PROVIDER 에 따라 Broker 구현을 선택. [owner: P1]
 * 기본값은 "mock" — KIS 키 없이 개발 가능.
 */
export function getBroker(): Broker {
  if (process.env.BROKER_PROVIDER === "kis") {
    return new KisBroker({
      appKey: process.env.KIS_APP_KEY ?? "",
      appSecret: process.env.KIS_APP_SECRET ?? "",
      baseUrl: process.env.KIS_BASE_URL ?? "",
    });
  }
  return new MockBroker();
}

export type { Broker, PlaceOrderInput, PlaceOrderResult, Quote, TokenInfo } from "./types";
