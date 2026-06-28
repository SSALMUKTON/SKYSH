import { parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import type { Market } from "@prisma/client";
import { readDataBuffer } from "./storage";

/**
 * 거시경제 지표(`data/{us,kr}/macro/*`) 읽기. [owner: P2]
 *
 * 파이프라인이 자산군 무관 단일값 시계열로 저장한 parquet(컬럼 = 지표값,
 * 인덱스 `__index_level_0__` = 날짜)을 읽어 거래하기 화면의 "거시지표" 탭에 쓴다.
 * 종목과 무관한 시장 전체 지표라 symbol 인자가 없다. ⚠️ 서버 전용(fs).
 *
 * 시장별로 "적합한" 지표만 큐레이션:
 *  - US  : FRED (금리·물가·고용·심리·변동성)
 *  - KR  : ECOS (한은 기준금리·국고채·CD·환율·물가)
 *  - COIN: 글로벌 위험자산 환경 (미 금리·VIX·달러) — FRED + 환율
 */

export interface MacroPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface MacroIndicator {
  key: string;
  label: string;
  unit: string; // "%" · "%p" · "원" · "" (지수)
  decimals: number;
  hint?: string;
  latest: number | null;
  prev: number | null; // 직전 관측치 (델타 계산용)
  asOf: string | null; // 최신 관측 날짜
  series: MacroPoint[]; // 최근 구간 (스파크라인용)
}

interface MacroSpec {
  key: string;
  path: string; // DATA_DIR 기준 상대 경로
  col: string; // parquet 의 값 컬럼명
  label: string;
  unit: string;
  decimals: number;
  yoy?: boolean; // 지수(레벨) → 전년동월비(%)로 변환해 표시 (월간 데이터 가정)
  hint?: string;
}

const fred = (id: string) => `us/macro/fred/${id}.parquet`;
const ecos = (name: string) => `kr/macro/ecos/${name}.parquet`;

const US_MACRO: MacroSpec[] = [
  { key: "fedfunds", path: fred("FEDFUNDS"), col: "FEDFUNDS", label: "미국 기준금리", unit: "%", decimals: 2, hint: "연방기금금리 — 통화정책 강도" },
  { key: "dgs10", path: fred("DGS10"), col: "DGS10", label: "미 국채 10년", unit: "%", decimals: 2, hint: "장기 시장금리" },
  { key: "dgs2", path: fred("DGS2"), col: "DGS2", label: "미 국채 2년", unit: "%", decimals: 2, hint: "단기 시장금리" },
  { key: "t10y2y", path: fred("T10Y2Y"), col: "T10Y2Y", label: "장단기 금리차(10Y-2Y)", unit: "%p", decimals: 2, hint: "마이너스면 경기침체 신호" },
  { key: "cpi", path: fred("CPIAUCSL"), col: "CPIAUCSL", label: "소비자물가(전년比)", unit: "%", decimals: 1, yoy: true, hint: "CPI 전년동월 대비 상승률" },
  { key: "unrate", path: fred("UNRATE"), col: "UNRATE", label: "실업률", unit: "%", decimals: 1, hint: "미국 실업률" },
  { key: "umcsent", path: fred("UMCSENT"), col: "UMCSENT", label: "소비자심리지수", unit: "", decimals: 1, hint: "미시간대 소비자심리(높을수록 낙관)" },
  { key: "vix", path: fred("VIXCLS"), col: "VIXCLS", label: "VIX 변동성지수", unit: "", decimals: 2, hint: "공포지수 — 높을수록 위험회피" },
];

const KR_MACRO: MacroSpec[] = [
  { key: "base_rate", path: ecos("base_rate"), col: "base_rate", label: "한국 기준금리", unit: "%", decimals: 2, hint: "한은 기준금리" },
  { key: "ktb_3y", path: ecos("ktb_3y"), col: "ktb_3y", label: "국고채 3년", unit: "%", decimals: 2, hint: "단기 시장금리" },
  { key: "ktb_10y", path: ecos("ktb_10y"), col: "ktb_10y", label: "국고채 10년", unit: "%", decimals: 2, hint: "장기 시장금리" },
  { key: "cd_91d", path: ecos("cd_91d"), col: "cd_91d", label: "CD 91일", unit: "%", decimals: 2, hint: "단기 자금시장 금리" },
  { key: "usdkrw", path: ecos("usdkrw"), col: "usdkrw", label: "원/달러 환율", unit: "원", decimals: 1, hint: "원화 약세 시 외국인 매도 압력" },
  { key: "cpi", path: ecos("cpi"), col: "cpi", label: "소비자물가(전년比)", unit: "%", decimals: 1, yoy: true, hint: "CPI 전년동월 대비 상승률" },
];

// 코인은 자체 거시지표가 없어 글로벌 기준인 미국(FRED) 지표를 그대로 사용한다.
const SPEC: Record<Market, MacroSpec[]> = { US: US_MACRO, KR: KR_MACRO, COIN: US_MACRO };

/** 시장별 데이터 출처 표기(화면 각주용). */
export const MACRO_SOURCE: Record<Market, string> = {
  US: "FRED (미 연준)",
  KR: "한국은행 ECOS",
  COIN: "FRED (미 연준)",
};

const cache = new Map<string, MacroPoint[] | null>();

function toNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return Number(v ?? NaN);
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "bigint") return new Date(Number(v)).toISOString().slice(0, 10);
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/** 단일 지표 parquet → 오름차순 시계열. 파일 없으면 null. 결과는 프로세스 캐시. */
async function readSeries(relPath: string, col: string): Promise<MacroPoint[] | null> {
  let pts = cache.get(relPath);
  if (pts === undefined) {
    const buf = await readDataBuffer(relPath);
    if (buf === null) {
      pts = null;
    } else {
      const ab = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ) as ArrayBuffer;
      const rows = (await parquetReadObjects({ file: ab, compressors })) as Record<string, unknown>[];
      pts = rows
        .map((r) => ({ date: toDateStr(r.__index_level_0__), value: toNum(r[col]) }))
        .filter((p) => Number.isFinite(p.value))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    cache.set(relPath, pts);
  }
  return pts;
}

/** 월간 레벨 시계열 → 전년동월비(%). 12개월 이전 값과 비교. */
function toYoY(pts: MacroPoint[]): MacroPoint[] {
  const out: MacroPoint[] = [];
  for (let i = 12; i < pts.length; i++) {
    const base = pts[i - 12].value;
    if (base) out.push({ date: pts[i].date, value: (pts[i].value / base - 1) * 100 });
  }
  return out;
}

/**
 * 시장에 적합한 거시지표 목록. 각 지표는 최신값·직전값·최근 시계열(스파크라인)을 담는다.
 * @param points 스파크라인에 포함할 최근 관측치 수.
 */
export async function readMacro(market: Market, points = 180): Promise<MacroIndicator[]> {
  const specs = SPEC[market] ?? [];
  const out: MacroIndicator[] = [];
  for (const s of specs) {
    let pts = await readSeries(s.path, s.col);
    if (!pts || pts.length === 0) continue;
    if (s.yoy) pts = toYoY(pts);
    if (pts.length === 0) continue;
    const latest = pts[pts.length - 1];
    const prev = pts.length > 1 ? pts[pts.length - 2] : null;
    out.push({
      key: s.key,
      label: s.label,
      unit: s.unit,
      decimals: s.decimals,
      hint: s.hint,
      latest: latest.value,
      prev: prev?.value ?? null,
      asOf: latest.date,
      series: pts.slice(-points),
    });
  }
  return out;
}
