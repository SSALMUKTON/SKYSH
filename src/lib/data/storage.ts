/**
 * 데이터 스토리지 추상화. [owner: P1]
 *
 * 캐싱된 정적 데이터(`data/`)를 두 가지 백엔드에서 동일 API 로 읽는다.
 *  - 로컬/개발: `DATA_BASE_URL` 미설정 시 프로세스 작업디렉터리의 `data/` 를 fs 로 읽음.
 *  - 배포(Vercel): `DATA_BASE_URL` 설정 시 그 base URL 뒤에 키를 붙여 HTTP fetch.
 *    Cloudflare R2 / Supabase Storage / GCS / S3 / CDN 의 public(또는 서명) base URL 무엇이든 동작.
 *
 * 키(key)는 항상 `data/` 기준 상대경로다. 예: `us/prices/AAPL.parquet`.
 * ⚠️ 서버 전용.
 */
import { readFile, readdir } from "node:fs/promises";

const BASE = process.env.DATA_BASE_URL?.replace(/\/+$/, "") || "";
const LOCAL_ROOT = `${process.cwd().replace(/\\/g, "/")}/data`;

/** 원격(버킷) 모드 여부. */
export function isRemote(): boolean {
  return BASE.length > 0;
}

function clean(key: string): string {
  return key.replace(/^\/+|\/+$/g, "");
}

/** 바이너리(예: parquet) 읽기. 없으면 null. */
export async function readDataBuffer(key: string): Promise<Buffer | null> {
  if (BASE) {
    const res = await fetch(`${BASE}/${clean(key)}`);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  try {
    return await readFile(`${LOCAL_ROOT}/${clean(key)}`);
  } catch {
    return null;
  }
}

/** 텍스트(예: JSON) 읽기. 없으면 null. */
export async function readDataText(key: string): Promise<string | null> {
  if (BASE) {
    const res = await fetch(`${BASE}/${clean(key)}`);
    if (!res.ok) return null;
    return await res.text();
  }
  try {
    return await readFile(`${LOCAL_ROOT}/${clean(key)}`, "utf-8");
  } catch {
    return null;
  }
}

/** JSON 읽기 헬퍼. 없거나 파싱 실패 시 null. */
export async function readDataJson<T>(key: string): Promise<T | null> {
  const text = await readDataText(key);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * 디렉터리(prefix) 하위 파일명 목록.
 *  - 로컬: fs readdir.
 *  - 원격: 객체 스토리지엔 디렉터리 개념이 없으므로 빌드 시 생성한 `<prefix>/_index.json`
 *    (파일명 문자열 배열)을 fetch 한다. `scripts/gen-data-manifests.mjs` 가 생성.
 * prefix "" 는 `data/` 루트.
 */
export async function listData(prefix: string): Promise<string[]> {
  const p = clean(prefix);
  if (BASE) {
    const res = await fetch(`${BASE}/${p ? `${p}/_index.json` : "_index.json"}`);
    if (!res.ok) return [];
    try {
      return (await res.json()) as string[];
    } catch {
      return [];
    }
  }
  try {
    return await readdir(p ? `${LOCAL_ROOT}/${p}` : LOCAL_ROOT);
  } catch {
    return [];
  }
}
