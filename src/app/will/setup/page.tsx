"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Loader2, X } from "lucide-react";
import { OrnamentalDivider } from "@/components/cert-ui";
import { RuleType } from "@prisma/client";

const QUESTIONS = [
  {
    id: "CHASE_SURGE" as RuleType,
    q: "오늘 아침 관심 종목이 +12% 올라있어. 어떻게 해?",
    options: [
      { label: "바로 시장가로 산다", risky: true },
      { label: "눌림목 올 때까지 기다린다", risky: false },
      { label: "그냥 넘긴다", risky: false },
    ],
    clause: "나는 급등 직후 시장가로 추격 매수하지 않는다.",
  },
  {
    id: "NO_STOP_LOSS" as RuleType,
    q: "매수 전에 손절 기준 먼저 정해?",
    options: [
      { label: "아니, 상황 보면서 결정한다", risky: true },
      { label: "항상 미리 정한다", risky: false },
      { label: "손절은 안 한다, 오를 때까지 기다린다", risky: true },
    ],
    clause: "나는 손절 기준 없는 거래를 시작하지 않는다.",
  },
  {
    id: "ALL_IN" as RuleType,
    q: "확신이 생기면 얼마나 넣어?",
    options: [
      { label: "다 넣는다, 확신이면 의미 없잖아", risky: true },
      { label: "일부만, 나눠서 들어간다", risky: false },
      { label: "소액만, 틀릴 수도 있으니까", risky: false },
    ],
    clause: "나는 확신이 있어도 한 번에 전액 매수하지 않는다.",
  },
  {
    id: "REVENGE_TRADE" as RuleType,
    q: "TSLA에서 -10% 손절했어. 같은 날 TSLA 다시 들어가고 싶어?",
    options: [
      { label: "그렇다, 본전 찾고 싶다", risky: true },
      { label: "아니, 그날은 손 뗀다", risky: false },
      { label: "상황 보고 결정한다", risky: true },
    ],
    clause: "나는 손실 만회를 목적으로 같은 날 재진입하지 않는다.",
  },
  {
    id: "MARKET_ORDER_IMPULSE" as RuleType,
    q: "급하게 사고 싶을 때 주문 유형이 뭐야?",
    options: [
      { label: "시장가, 빠르게 체결되야 하니까", risky: true },
      { label: "지정가, 원하는 가격 아니면 안 산다", risky: false },
      { label: "그때그때 다르다", risky: true },
    ],
    clause: "나는 과열 구간에서 충동적으로 시장가 주문을 내지 않는다.",
  },
];

interface ConvertedClause {
  ruleType: RuleType;
  displayText: string;
  params: Record<string, unknown>;
  fromText: string; // 원본 입력
}

type Step = "quiz" | "custom" | "result";

export default function WillSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("quiz");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  // 자연어 입력
  const [inputText, setInputText] = useState("");
  const [converting, setConverting] = useState(false);
  const [customClauses, setCustomClauses] = useState<ConvertedClause[]>([]);

  const [saving, setSaving] = useState(false);

  function answerQ(risky: boolean) {
    const next = { ...answers, [QUESTIONS[current].id]: risky };
    setAnswers(next);
    if (current < QUESTIONS.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setStep("custom");
    }
  }

  async function convert() {
    if (!inputText.trim()) return;
    setConverting(true);
    const res = await fetch("/api/clauses/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputText.trim() }),
    });
    const data = await res.json();
    setCustomClauses((prev) => [...prev, { ...data, fromText: inputText.trim() }]);
    setInputText("");
    setConverting(false);
  }

  const quizClauses = QUESTIONS.filter((q) => answers[q.id] === true);
  const finalQuizClauses = quizClauses.length > 0 ? quizClauses : QUESTIONS.slice(0, 2);

  async function save() {
    setSaving(true);
    const existing = await fetch("/api/clauses").then((r) => r.json());
    await Promise.all(existing.map((c: { id: string }) => fetch(`/api/clauses/${c.id}`, { method: "DELETE" })));
    await Promise.all([
      ...finalQuizClauses.map((q) =>
        fetch("/api/clauses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleType: q.id, params: {}, displayText: q.clause }),
        })
      ),
      ...customClauses.map((c) =>
        fetch("/api/clauses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleType: c.ruleType, params: c.params, displayText: c.displayText }),
        })
      ),
    ]);
    setSaving(false);
    router.push("/will");
  }

  const q = QUESTIONS[current];
  const progress = (current / QUESTIONS.length) * 100;
  const totalClauses = finalQuizClauses.length + customClauses.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-12 py-4 border-b border-border">
        <Link href="/" className="text-lg font-black text-foreground">故래소</Link>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">첫 투자 유언장 작성</span>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-8">
        <div className="w-full max-w-lg">

          {/* ── 퀴즈 단계 ── */}
          {step === "quiz" && (
            <div className="border border-[#C9A227]/40">
              <div className="bg-[#FDF8EC] px-8 pt-7 pb-5 text-center border-b border-[#C9A227]/20">
                <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">나의 첫 투자 유언장</p>
                <h2 className="text-xl font-black text-foreground tracking-tight mb-3">투 자 습 관 진 단</h2>
                <OrnamentalDivider />
                <p className="text-xs text-[#7A5F0E]/80 mt-1">솔직하게 답할수록 맞춤 유언장이 만들어집니다.</p>
              </div>
              <div className="h-0.5 bg-muted">
                <div className="h-full bg-[#C9A227] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="px-8 py-8">
                <p className="text-[10px] text-muted-foreground font-bold tracking-wider mb-4 uppercase">
                  {current + 1} / {QUESTIONS.length}
                </p>
                <p className="text-base font-bold text-foreground leading-relaxed mb-6">{q.q}</p>
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQ(opt.risky)}
                      className="w-full text-left px-4 py-3.5 border border-border bg-background hover:border-[#C9A227]/50 hover:bg-[#FDF8EC] transition-all text-sm text-foreground"
                    >
                      <span className="font-bold text-[#C9A227] mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep("custom")}
                  className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors">
                  건너뛰기
                </button>
              </div>
            </div>
          )}

          {/* ── 자연어 입력 단계 ── */}
          {step === "custom" && (
            <div className="border border-[#C9A227]/40">
              <div className="bg-[#FDF8EC] px-8 pt-7 pb-5 text-center border-b border-[#C9A227]/20">
                <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">추가 원칙</p>
                <h2 className="text-xl font-black text-foreground tracking-tight mb-3">나만의 원칙 추가</h2>
                <OrnamentalDivider />
                <p className="text-xs text-[#7A5F0E]/80 mt-1">
                  직접 경험한 실수를 적어주세요. AI가 조항으로 만들어드립니다.
                </p>
              </div>

              <div className="px-8 py-6">
                <p className="text-[10px] text-muted-foreground font-bold tracking-wider mb-3 uppercase">예시</p>
                <div className="space-y-1 mb-6">
                  {["새벽에 코인 사면 항상 후회함", "뉴스 보고 바로 사면 항상 고점", "물타기 하다가 더 크게 손해봄"].map((ex) => (
                    <button key={ex} onClick={() => setInputText(ex)}
                      className="block text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
                      "{ex}"
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && convert()}
                    placeholder="경험한 실수나 원칙을 자유롭게 적어주세요"
                    className="flex-1 border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A227]/50"
                  />
                  <button onClick={convert} disabled={converting || !inputText.trim()}
                    className="px-4 py-2.5 bg-foreground text-background text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5">
                    {converting ? <Loader2 size={12} className="animate-spin" /> : "변환"}
                  </button>
                </div>

                {customClauses.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {customClauses.map((c, i) => (
                      <div key={i} className="border border-[#C9A227]/30 bg-[#FDFAF6] px-4 py-3">
                        <p className="text-[9px] text-muted-foreground mb-1">"{c.fromText}" →</p>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground leading-relaxed">{c.displayText}</p>
                          <button onClick={() => setCustomClauses((prev) => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-[#B83535] shrink-0 mt-0.5">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#FDF8EC] px-8 py-5 border-t border-[#C9A227]/20">
                <OrnamentalDivider />
                <button onClick={() => setStep("result")}
                  className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity mt-3">
                  결과 확인하기
                </button>
                <button onClick={() => setStep("result")}
                  className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
                  건너뛰기
                </button>
              </div>
            </div>
          )}

          {/* ── 결과 단계 ── */}
          {step === "result" && (
            <div className="border border-[#C9A227]/40">
              <div className="bg-[#FDF8EC] px-8 pt-7 pb-5 text-center border-b border-[#C9A227]/20">
                <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">진단 완료</p>
                <h2 className="text-xl font-black text-foreground tracking-tight mb-3">나의 투 자 유 언 장</h2>
                <OrnamentalDivider />
                <p className="text-xs text-[#7A5F0E]/80 mt-1">
                  총 {totalClauses}개 조항이 생성됐습니다.
                </p>
              </div>

              <div className="px-6 py-4 space-y-2 border-b border-[#C9A227]/20">
                {finalQuizClauses.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 px-4 py-3.5 border border-[#C9A227]/30 bg-[#FDFAF6]">
                    <span className="text-[11px] font-black text-[#C9A227] shrink-0 pt-0.5">제{i + 1}조.</span>
                    <span className="text-sm text-foreground leading-relaxed">{q.clause}</span>
                  </div>
                ))}
                {customClauses.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 border border-[#C9A227]/30 bg-[#FDFAF6]">
                    <span className="text-[11px] font-black text-[#C9A227] shrink-0 pt-0.5">제{finalQuizClauses.length + i + 1}조.</span>
                    <span className="text-sm text-foreground leading-relaxed">{c.displayText}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#FDF8EC] px-8 py-5">
                <OrnamentalDivider />
                <button onClick={save} disabled={saving}
                  className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 mt-3">
                  {saving ? "저장 중..." : "유언장 저장하기"}
                </button>
                <button onClick={() => { setCurrent(0); setAnswers({}); setCustomClauses([]); setStep("quiz"); }}
                  className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
                  다시 진단하기
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
