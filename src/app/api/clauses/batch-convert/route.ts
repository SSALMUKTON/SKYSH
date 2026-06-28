import { NextRequest, NextResponse } from "next/server";
import { RuleType } from "@prisma/client";

interface DraftClause {
  tempId: string;
  ruleType: string;
  displayText: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { items } = body as { items?: string[] };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "항목이 없습니다" }, { status: 400 });
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `다음은 투자자가 개선하고 싶은 나쁜 투자 습관들입니다. 이들을 분석해서 다음 형식의 JSON으로 정제하고 병합해주세요:

항목들:
${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}

지시사항:
1. 중복되거나 유사한 항목들은 병합하세요
2. 각 항목에 가장 적합한 규칙 유형을 다음 중에서 선택하세요: CHASE_SURGE, PREMARKET_GAP, NO_STOP_LOSS, REVENGE_TRADE, MARKET_ORDER_IMPULSE, AVERAGING_DOWN
3. 명확하고 실행 가능한 자연어로 다시 작성하세요

JSON 형식:
{
  "clauses": [
    {
      "tempId": "draft_1",
      "ruleType": "CHASE_SURGE",
      "displayText": "..."
    }
  ]
}

JSON만 반환해주세요.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "응답 파싱 실패" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    const clauses: DraftClause[] = (result.clauses || []).map(
      (c: any, i: number) => ({
        tempId: `draft_${Date.now()}_${i}`,
        ruleType: c.ruleType,
        displayText: c.displayText,
      })
    );

    return NextResponse.json({ clauses });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "변환 실패" }, { status: 500 });
  }
}
