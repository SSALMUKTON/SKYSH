import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { brokerOrderId, decisionReason, forceReason } = body as {
    brokerOrderId?: string;
    decisionReason?: string;
    forceReason?: string | null;
  };

  if (!brokerOrderId || !decisionReason) {
    return NextResponse.json(
      { error: "brokerOrderId와 decisionReason 필수" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { brokerOrderId },
  });

  if (!order) {
    return NextResponse.json({ error: "주문 없음" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      decisionReason,
      forceReason: forceReason || null,
    },
  });

  return NextResponse.json(updated);
}
