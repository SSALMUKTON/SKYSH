import type { Market } from "@prisma/client";

/**
 * 거래(Trade) 수명주기 보조 계산 + 보고서 트리거. [owner: P1]
 * 매수 체결 → OPEN, 매도 체결 → CLOSED 시 손익률·보유시간 산출, 그리고 P3 보고서 트리거.
 */

/** 손익률(%) = (청산가 - 진입가) / 진입가 × 100. 매수→매도 기준. */
export function computePnlPct(entryPrice: number, exitPrice: number): number {
  if (!entryPrice) return 0;
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

/** 보유 시간(분). */
export function computeHoldMin(entryAt: Date, exitAt: Date): number {
  return Math.max(0, Math.round((exitAt.getTime() - entryAt.getTime()) / 60000));
}

/**
 * 청산된 거래에 대해 P3 보고서 생성을 트리거(best-effort). [owner: P1 배선 · P3 생성]
 * 보고서 생성/저장 자체는 P3(/api/reports POST) 소관이므로 여기서는 호출만 하고,
 * 아직 미구현이면 조용히 무시한다(거래 실행 흐름을 막지 않음).
 *
 * @param origin 현재 요청의 origin (예: http://localhost:3000)
 * @param tradeId 청산된 Trade id
 */
export async function triggerReport(origin: string, tradeId: string): Promise<void> {
  try {
    await fetch(`${origin}/api/reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tradeId }),
    });
  } catch {
    // P3 미구현/오류 시 무시 — 거래는 이미 정상 청산됨.
  }
}

/** 코인은 소수 수량을 쓰므로 숫자 파싱 시 안전 가드. */
export function parsePositive(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const MARKETS: Market[] = ["KR", "US", "COIN"];
export function isMarket(v: unknown): v is Market {
  return v === "KR" || v === "US" || v === "COIN";
}
