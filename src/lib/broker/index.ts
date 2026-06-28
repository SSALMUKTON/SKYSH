import type { Broker, BrokerCredentials } from "./types";
import { MockBroker } from "./mock";
import { KisBroker } from "./kis";

/**
 * Broker 구현 선택. [owner: P1]
 * 기본값 "mock" — 키 없이 개발 가능. 실연동 시 자격증명은 요청(클라이언트
 * localStorage → Authorization 헤더)에서 받아 주입한다. 서버에 저장하지 않음(spec.md).
 *
 * @param creds 실연동 시 클라이언트가 전달한 자격증명
 */
export function getBroker(creds?: BrokerCredentials): Broker {
  if (process.env.BROKER_PROVIDER === "kis") {
    return new KisBroker(creds ?? { apiKey: "" });
  }
  return new MockBroker();
}

export type {
  Broker,
  BrokerCredentials,
  PlaceOrderInput,
  OrderAck,
  Fill,
  Balance,
  Quote,
} from "./types";
