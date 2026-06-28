import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOrder } from "@/lib/rules/engine";
import type { OrderDraft, MarketData } from "@/lib/rules/types";

export async function POST(req: Request) {
  const body = await req.json() as {
    userId: string;
    order: OrderDraft;
    market: MarketData;
  };

  if (!body.userId || !body.order || !body.market) {
    return NextResponse.json({ error: "userId, order, market required" }, { status: 400 });
  }

  const rawClauses = await prisma.clause.findMany({
    where: { userId: body.userId, active: true },
    select: { id: true, ruleType: true, params: true, displayText: true },
  });

  const clauses = rawClauses.map((c) => ({
    id: c.id,
    ruleType: c.ruleType,
    params: c.params as Record<string, unknown>,
    displayText: c.displayText,
  }));

  const result = checkOrder(body.order, body.market, clauses);
  return NextResponse.json(result);
}
