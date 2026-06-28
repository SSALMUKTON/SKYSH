import { NextResponse } from "next/server";

/**
 * /api/broker/token — KIS access token 발급/캐시 상태. [owner: P1]
 *
 *   GET  : 현재 캐시된 토큰의 만료시각 등 상태
 *   POST : 토큰 강제 갱신 — getBroker().getAccessToken() 후 BrokerAccount 에 캐시
 *
 * 토큰은 24h 유효하므로 BrokerAccount.kisTokenCache / tokenExpiresAt 에 보관해 재사용.
 */
export async function GET() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", todo: "토큰 캐시 상태" },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P1", see: "src/lib/broker" },
    { status: 501 },
  );
}
