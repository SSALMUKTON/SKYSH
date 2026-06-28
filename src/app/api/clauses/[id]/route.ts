import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/clauses/[id] — 조항 수정 (params, displayText, active)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { params: ruleParams, displayText, active } = body;

  const clause = await prisma.clause.update({
    where: { id },
    data: {
      ...(ruleParams !== undefined && { params: ruleParams }),
      ...(displayText !== undefined && { displayText }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json(clause);
}

// DELETE /api/clauses/[id] — 조항 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.clause.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
