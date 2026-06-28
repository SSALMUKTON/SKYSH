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
 * 한국투자증권(KIS) Developers 연동 — 읽기 전용 현재가. [owner: P1, 여유]
 *
 * 범위(spec.md P1 [여유]): "토큰 발급+캐시 + 읽기 전용 현재가만".
 *   - getQuote: KR 국내(inquire-price) · US 해외(overseas price) 지원.
 *   - placeOrder/getFill/getBalance: 미구현(읽기 전용) — 호출 시 명시적 오류.
 *
 * 보안: 자격증명(appkey/appsecret)은 서버에 저장하지 않고 요청마다 주입받는다(spec.md).
 *   접근토큰만 프로세스 메모리에 짧게 캐시(appkey 단위, 만료 1분 전 폐기).
 *   BROKER_PROVIDER=kis 일 때만 사용되며 기본(mock) 경로에는 영향 없음.
 */

const PROD_BASE = "https://openapi.koreainvestment.com:9443";
const VPS_BASE = "https://openapivts.koreainvestment.com:29443"; // 모의투자

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}
const tokenCache = new Map<string, CachedToken>();

export class KisBroker implements Broker {
  private readonly base: string;

  constructor(private readonly creds: BrokerCredentials) {
    this.base = process.env.KIS_ENV === "vps" ? VPS_BASE : PROD_BASE;
  }

  /** 접근토큰 발급 + 캐시(appkey 단위). 만료 1분 전이면 재발급. */
  private async accessToken(): Promise<string> {
    const { apiKey, apiSecret } = this.creds;
    if (!apiKey || !apiSecret) throw new Error("KIS appkey/appsecret 누락");

    const cached = tokenCache.get(apiKey);
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

    const res = await fetch(`${this.base}/oauth2/tokenP`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: apiKey,
        appsecret: apiSecret,
      }),
    });
    if (!res.ok) throw new Error(`KIS 토큰 발급 실패: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache.set(apiKey, {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
    });
    return data.access_token;
  }

  private async headers(trId: string): Promise<HeadersInit> {
    return {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${await this.accessToken()}`,
      appkey: this.creds.apiKey,
      appsecret: this.creds.apiSecret ?? "",
      tr_id: trId,
      custtype: "P",
    };
  }

  async getQuote(market: Market, symbol: string): Promise<Quote> {
    if (market === "KR") return this.getQuoteKr(symbol);
    if (market === "US") return this.getQuoteUs(symbol);
    throw new Error("KIS 는 코인 시세를 제공하지 않습니다(Upbit 사용).");
  }

  /** 국내주식 현재가 (FHKST01010100). */
  private async getQuoteKr(symbol: string): Promise<Quote> {
    const url = new URL(`${this.base}/uapi/domestic-stock/v1/quotations/inquire-price`);
    url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
    url.searchParams.set("FID_INPUT_ISCD", symbol);
    const res = await fetch(url, { headers: await this.headers("FHKST01010100") });
    if (!res.ok) throw new Error(`KIS 국내 현재가 실패: ${res.status}`);
    const out = ((await res.json()) as { output?: Record<string, string> }).output ?? {};
    const price = Number(out.stck_prpr);
    const prevClose = Number(out.stck_sdpr) || price;
    return {
      market: "KR",
      symbol,
      price,
      prevClose,
      changePct: Number(out.prdy_ctrt) || (prevClose ? ((price - prevClose) / prevClose) * 100 : 0),
      volume: Number(out.acml_vol) || 0,
      isPremarket: false,
      asOf: new Date(),
    };
  }

  /** 해외주식 현재가 (HHDFS00000300). 거래소는 NAS→NYS→AMS 순으로 시도. */
  private async getQuoteUs(symbol: string): Promise<Quote> {
    for (const excd of ["NAS", "NYS", "AMS"]) {
      const url = new URL(`${this.base}/uapi/overseas-price/v1/quotations/price`);
      url.searchParams.set("AUTH", "");
      url.searchParams.set("EXCD", excd);
      url.searchParams.set("SYMB", symbol);
      const res = await fetch(url, { headers: await this.headers("HHDFS00000300") });
      if (!res.ok) continue;
      const out = ((await res.json()) as { output?: Record<string, string> }).output ?? {};
      const price = Number(out.last);
      if (!price) continue;
      const prevClose = Number(out.base) || price;
      return {
        market: "US",
        symbol,
        price,
        prevClose,
        changePct: Number(out.rate) || (prevClose ? ((price - prevClose) / prevClose) * 100 : 0),
        volume: Number(out.tvol) || 0,
        isPremarket: false,
        asOf: new Date(),
      };
    }
    throw new Error(`KIS 해외 현재가 실패: ${symbol} (거래소 미상)`);
  }

  async placeOrder(input: PlaceOrderInput): Promise<OrderAck> {
    throw new Error(`KIS read-only — 주문 미구현 (${input.side} ${input.symbol})`);
  }

  async getFill(brokerOrderId: string): Promise<Fill> {
    throw new Error(`KIS read-only — 체결조회 미구현 (${brokerOrderId})`);
  }

  async getBalance(market: Market): Promise<Balance> {
    throw new Error(`KIS read-only — 잔고조회 미구현 (${market})`);
  }
}
