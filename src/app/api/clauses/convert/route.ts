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

    if (!VALID_RULE_TYPES.includes(parsed.ruleType as RuleType)) {
      parsed.ruleType = "NO_STOP_LOSS";
    }

    return NextResponse.json({
      ruleType: parsed.ruleType,
      displayText: parsed.displayText,
      params: parsed.params ?? {},
    });
  } catch {
    // fallback: 그대로 NO_STOP_LOSS로 감싸기
    return NextResponse.json({
      ruleType: "NO_STOP_LOSS",
      displayText: text.trim().endsWith(".") ? text.trim() : `${text.trim()}.`,
      params: {},
    });
  }
}
