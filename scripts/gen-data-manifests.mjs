/**
 * data/ 하위 모든 디렉터리에 `_index.json`(파일명 배열) 생성. [owner: P1]
 *
 * 객체 스토리지(R2/Supabase/GCS)엔 디렉터리 listing 이 없으므로,
 * 앱의 `listData(prefix)` 가 `<prefix>/_index.json` 을 fetch 해 목록을 얻는다.
 * 데이터 업로드 **전에** 한 번 실행하면 매니페스트가 data/ 안에 같이 생긴다.
 *
 *   node scripts/gen-data-manifests.mjs
 */
import { readdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(process.cwd(), "data");

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const files = [];
  const subdirs = [];
  for (const e of entries) {
    if (e.name === "_index.json" || e.name === ".DS_Store") continue;
    if (e.isDirectory()) subdirs.push(e.name);
    else if (e.isFile()) files.push(e.name);
  }
  await writeFile(join(dir, "_index.json"), JSON.stringify(files), "utf-8");
  for (const d of subdirs) await walk(join(dir, d));
}

const rootStat = await stat(ROOT).catch(() => null);
if (!rootStat) {
  console.error(`data/ 디렉터리가 없습니다: ${ROOT}`);
  process.exit(1);
}
await walk(ROOT);
console.log("✓ data/ 하위 _index.json 매니페스트 생성 완료");
