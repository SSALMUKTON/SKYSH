import { NextResponse } from "next/server";

/**
 * /api/clauses — 유언 조항 CRUD. [owner: P4]
 *
 *   GET  : 사용자의 Clause 목록 (active 필터)
 *   POST : 조항 생성 — ruleType, params, displayText
 *
 * 구현 가이드: prisma.clause.* . 수정/삭제·제안 승인은
 *   /api/clauses/[id] (PATCH/DELETE), /api/clauses/suggestions/[id] 라우트 추가.
 */
export async function GET() {
  return NextResponse.json(
    { error: "not implemented", owner: "P4", todo: "Clause 목록 조회" },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P4", todo: "Clause 생성" },
    { status: 501 },
  );
}
