import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@goraeso.dev";

// PATCH /api/clauses/suggestions/[id] — 제안 승인(APPROVED) 또는 거절(REJECTED)
// 승인 시: 기존 clauseId 있으면 params 갱신, 없으면 새 Clause 생성
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json(); // "APPROVED" | "REJECTED"

  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json({ error: "status는 APPROVED 또는 REJECTED" }, { status: 400 });
  }

  const suggestion = await prisma.clauseSuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (status === "APPROVED") {
    if (suggestion.clauseId) {
      // 기존 조항 params + displayText 갱신
      await prisma.clause.update({
        where: { id: suggestion.clauseId },
        data: {
          params: suggestion.suggestedParams as object,
          displayText: suggestion.displayText,
        },
      });
    } else {
      // 새 조항 생성
      const user = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USER_EMAIL } });
      await prisma.clause.create({
        data: {
          userId: user.id,
          ruleType: suggestion.ruleType,
          params: suggestion.suggestedParams as object,
          displayText: suggestion.displayText,
        },
      });
    }
  }

  const updated = await prisma.clauseSuggestion.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}
