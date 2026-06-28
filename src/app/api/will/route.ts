import { NextResponse } from "next/server";

/**
 * /api/will — 유언 조항 CRUD. [owner: P4]
 *
 *   GET  : 사용자의 WillClause 목록 (status 필터)
 *   POST : 조항 생성 — ruleType, params, displayText
 *
 * 구현 가이드: prisma.willClause.* . 수정/삭제는
 *   /api/will/[id] (PATCH/DELETE) 라우트를 추가로 만들 것.
 */
export async function GET() {
  return NextResponse.json(
    { error: "not implemented", owner: "P4", todo: "WillClause 목록 조회" },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "not implemented", owner: "P4", todo: "WillClause 생성" },
    { status: 501 },
  );
}
