import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/user";
import { generateReport } from "@/lib/gemini/report";
import type { TradeSummary } from "@/lib/gemini/report";

// GET /api/reports — 사용자 보고서 목록
export async function GET() {
  const user = await getDemoUser();
  const reports = await prisma.report.findMany({
    where: { trade: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      trade: {
        select: { symbol: true, market: true, pnlPct: true, holdDurationMin: true },
      },
    },
  });
  return NextResponse.json({ reports });
}

// POST /api/reports — 보고서 생성 (이미 있으면 기존 반환)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { tradeId } = body as { tradeId?: string };
  if (!tradeId) return NextResponse.json({ error: "tradeId 필수" }, { status: 400 });

  const user = await getDemoUser();

  // 이미 생성된 보고서 있으면 바로 반환
  const existing = await prisma.report.findUnique({
    where: { tradeId },
    include: { suggestions: true },
  });
  if (existing) return NextResponse.json(existing);

  // 청산된 거래만 허용
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId: user.id, status: "CLOSED" },
    include: { orders: { orderBy: { createdAt: "asc" } } },
  });
  if (!trade) {
    return NextResponse.json({ error: "거래 없음 또는 미청산" }, { status: 404 });
  }

  // 활성 조항 로드
  const clauseRows = await prisma.clause.findMany({
    where: { userId: user.id, active: true },
    select: { id: true, ruleType: true, displayText: true },
  });

  const summary: TradeSummary = {
    market: trade.market,
    symbol: trade.symbol,
    pnlPct: trade.pnlPct ?? 0,
    holdDurationMin: trade.holdDurationMin ?? 0,
    orders: trade.orders.map((o) => ({
      side: o.side,
      orderType: o.orderType,
      quantity: Number(o.quantity),
      price: o.price ? Number(o.price) : null,
      stopPrice: o.stopPrice ? Number(o.stopPrice) : null,
      thesis: o.thesis,
      forceReason: o.forceReason,
    })),
    activeClauses: clauseRows,
  };

  const generated = await generateReport(summary);

  // 위반 조항 ID Set + ruleType → clauseId 매핑 (수정 제안 연결용)
  const violatedSet = new Set(
    Array.isArray(generated.violatedClauses) ? generated.violatedClauses : [],
  );
  const clauseByRuleType = new Map(clauseRows.map((c) => [c.ruleType, c]));

  const report = await prisma.report.create({
    data: {
      tradeId,
      kind: generated.kind,
      body: generated.body,
      causes: generated.causes,
      violatedClauses: generated.violatedClauses,
      rawAiResponse: generated.rawAiResponse ?? null,
      suggestions: {
        create: generated.suggestions.map((s) => {
          const matched = clauseByRuleType.get(s.ruleType);
          return {
            ruleType: s.ruleType,
            suggestedParams: s.suggestedParams as Prisma.InputJsonValue,
            displayText: s.displayText,
            rationale: s.rationale ?? null,
            clauseId: matched && violatedSet.has(matched.id) ? matched.id : null,
          };
        }),
      },
    },
    include: { suggestions: true },
  });

  return NextResponse.json(report, { status: 201 });
}
