import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildConvertPrompt, VALID_RULE_TYPES } from "@/lib/gemini/prompts";
import { RuleType } from "@prisma/client";

// POST /api/clauses/convert — 자연어 → 조항 변환
export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "text 필수" }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY 없음" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    });

    const result = await model.generateContent(buildConvertPrompt(text));
    const raw = result.response.text().trim();
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, ""));

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    if (!VALID_RULE_TYPES.includes(parsed.ruleType as RuleType)) {
      parsed.ruleType = "NO_STOP_LOSS";
    }

    return NextResponse.json({
      ruleType: parsed.ruleType,
      displayText: parsed.displayText,
      params: parsed.params ?? {},
    });
  } catch (err) {
    const error = err as Error;
    console.error("[convert] Error:", error.message);

    // API 키 관련 에러
    if (error.message.includes("401") || error.message.includes("API key")) {
      return NextResponse.json(
        { error: "API 키가 유효하지 않습니다. 관리자에게 문의하세요." },
        { status: 401 }
      );
    }

    // 할당량 초과
    if (error.message.includes("429") || error.message.includes("quota")) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
        { status: 429 }
      );
    }

    // JSON 파싱 실패 — 투자 원칙 아님
    return NextResponse.json(
      { error: "투자 원칙과 관련 없는 내용입니다." },
      { status: 422 }
    );
  }
}
