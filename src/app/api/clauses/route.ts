import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RuleType } from "@prisma/client";
import { getDemoUser } from "@/lib/user";

// GET /api/clauses — 활성 조항 목록
export async function GET() {
  const user = await getDemoUser();
  const clauses = await prisma.clause.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(clauses);
}

// POST /api/clauses — 조항 생성
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ruleType, params, displayText } = body;

  if (!ruleType || !displayText) {
    return NextResponse.json({ error: "ruleType, displayText 필수" }, { status: 400 });
  }
  if (!Object.values(RuleType).includes(ruleType)) {
    return NextResponse.json({ error: "유효하지 않은 ruleType" }, { status: 400 });
  }

  const user = await getDemoUser();
  const clause = await prisma.clause.create({
    data: { userId: user.id, ruleType, params: params ?? {}, displayText },
  });
  return NextResponse.json(clause, { status: 201 });
}
