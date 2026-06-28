import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json() as { status: "APPROVED" | "REJECTED" };

  if (!body.status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  const suggestion = await prisma.clauseSuggestion.findUnique({ where: { id } });
  if (!suggestion) {
    return NextResponse.json({ error: "suggestion not found" }, { status: 404 });
  }

  await prisma.clauseSuggestion.update({
    where: { id },
    data: { status: body.status },
  });

  if (body.status === "APPROVED") {
    if (suggestion.clauseId) {
      await prisma.clause.update({
        where: { id: suggestion.clauseId },
        data: {
          params: suggestion.suggestedParams as object,
          displayText: suggestion.displayText,
          updatedAt: new Date(),
        },
      });
    } else {
      const report = await prisma.report.findUnique({
        where: { id: suggestion.reportId },
        select: { trade: { select: { userId: true, id: true } } },
      });

      if (report) {
        await prisma.clause.create({
          data: {
            userId: report.trade.userId,
            ruleType: suggestion.ruleType,
            params: suggestion.suggestedParams as object,
            displayText: suggestion.displayText,
            sourceTradeId: report.trade.id,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, status: body.status });
}
