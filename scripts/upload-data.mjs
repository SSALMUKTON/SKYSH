/**
 * data/ 전체를 Cloudflare R2 버킷에 업로드(미러). [owner: P1]
 *
 * R2 는 S3 호환이라 AWS SDK 로 올린다. 매니페스트(_index.json) 포함 모든 파일을
 * `data/` 기준 상대키로 PUT. 앱의 DATA_BASE_URL = 이 버킷의 public(r2.dev) base.
 * 뉴스(us/news)는 날짜파일이 수천 개라 최근 NEWS_KEEP_DAYS(기본 7)일치만 업로드.
 *
 *   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET=skysh-data  node scripts/upload-data.mjs
 *
 * 사전: npm i -D @aws-sdk/client-s3 ; node scripts/gen-data-manifests.mjs
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const NEWS_KEEP_DAYS = Number(process.env.NEWS_KEEP_DAYS || 7);
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET || "skysh-data";
const ROOT = join(process.cwd(), "data");
const CONCURRENCY = 16;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error(
    "R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY 환경변수가 필요합니다.",
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

const CONTENT_TYPE = {
  ".json": "application/json",
  ".parquet": "application/octet-stream",
};

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === ".DS_Store") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

async function uploadOne(absPath) {
  const key = relative(ROOT, absPath).split("\\").join("/");
  const body = await readFile(absPath);
  const ext = key.slice(key.lastIndexOf("."));
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: CONTENT_TYPE[ext] || "application/octet-stream",
    }),
  );
  return key;
}

const rootStat = await stat(ROOT).catch(() => null);
if (!rootStat) {
  console.error(`data/ 없음: ${ROOT}`);
  process.exit(1);
}

// 최근 N일 뉴스만 유지: us/news 의 날짜파일을 추려 매니페스트도 그 목록으로 재작성.
const NEWS_DIR = join(ROOT, "us", "news");
const isNewsDate = (name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name);
let keepNews = null;
if (await stat(NEWS_DIR).catch(() => null)) {
  const dates = (await readdir(NEWS_DIR)).filter(isNewsDate).sort();
  keepNews = new Set(dates.slice(-NEWS_KEEP_DAYS));
  await writeFile(join(NEWS_DIR, "_index.json"), JSON.stringify([...keepNews]), "utf-8");
  console.log(`뉴스: 전체 ${dates.length}일 중 최근 ${keepNews.size}일만 업로드`);
}

const files = [];
for await (const f of walk(ROOT)) {
  const key = relative(ROOT, f).split("\\").join("/");
  if (keepNews && key.startsWith("us/news/")) {
    const base = key.slice("us/news/".length);
    if (isNewsDate(base) && !keepNews.has(base)) continue;
  }
  files.push(f);
}
console.log(`업로드 대상 ${files.length}개 → R2 버킷 "${BUCKET}"`);

let done = 0;
let failed = 0;
async function worker(queue) {
  while (queue.length) {
    const f = queue.pop();
    try {
      await uploadOne(f);
    } catch (e) {
      failed++;
      console.error("✗", e.message);
    }
    done++;
    if (done % 200 === 0 || done === files.length) {
      console.log(`  ${done}/${files.length} (실패 ${failed})`);
    }
  }
}

const queue = files.slice();
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
console.log(failed ? `완료(실패 ${failed}개 — 재실행하면 보완됨)` : "✓ 업로드 완료");
