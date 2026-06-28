import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/user";

interface DraftClause {
  tempId: string;
  ruleType: string;
  displayText: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { clauses } = body as { clauses?: DraftClause[] };

  if (!clauses || clauses.length === 0) {
    return NextResponse.json({ error: "조항이 없습니다" }, { status: 400 });
  }

  const user = await getDemoUser();

  const created = await Promise.all(
    clauses.map((clause) =>
      prisma.clause.create({
        data: {
          userId: user.id,
          ruleType: clause.ruleType as any,
          params: {},
          displayText: clause.displayText,
        },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}
