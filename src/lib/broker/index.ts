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

/**
 * 요청의 Authorization: Bearer <base64(JSON)> 에서 자격증명을 파싱한다. [owner: P1]
 * 보안 설계상 키는 서버에 저장하지 않고 클라이언트(localStorage)가 요청마다 실어 보낸다.
 * 없거나 파싱 실패면 undefined → getBroker 가 Mock 으로 동작.
 */
export function credsFromRequest(req: { headers: Headers }): BrokerCredentials | undefined {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return undefined;
  try {
    return JSON.parse(Buffer.from(auth.slice(7), "base64").toString("utf-8"));
  } catch {
    return undefined;
  }
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
