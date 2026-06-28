/**
 * patch-prisma.js
 *
 * Node.js v22 on Windows fails to resolve package.json `imports` (#-specifiers)
 * when the project path contains non-ASCII characters (e.g. Korean: 공모전).
 * Prisma 6's generated client uses `require('#main-entry-point')` in default.js,
 * which triggers this bug.
 *
 * This script patches .prisma/client/default.js to use a direct relative require
 * instead, bypassing the broken subpath-import resolution.
 *
 * Run after every `prisma generate` (wired into postinstall and db:generate).
 */

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  ".prisma",
  "client",
  "default.js",
);

if (!fs.existsSync(target)) {
  console.log("[patch-prisma] File not found, skipping:", target);
  process.exit(0);
}

const original = fs.readFileSync(target, "utf8");

if (!original.includes("require('#main-entry-point')")) {
  console.log("[patch-prisma] Already patched or no patch needed.");
  process.exit(0);
}

const patched = original.replace(
  "require('#main-entry-point')",
  "require('./index')",
);

fs.writeFileSync(target, patched, "utf8");
console.log("[patch-prisma] Patched .prisma/client/default.js successfully.");
