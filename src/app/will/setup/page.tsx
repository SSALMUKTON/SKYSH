"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Loader2, Edit2, X, Check } from "lucide-react";
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
    id: "AVERAGING_DOWN" as RuleType,
    q: "보유 종목이 3일 연속 하락 중이야. 어떻게 해?",
    options: [
      { label: "더 산다, 평단 낮출 수 있잖아", risky: true },
      { label: "그냥 기다린다", risky: false },
      { label: "손절하고 나온다", risky: false },
    ],
    clause: "나는 3일 연속 하락 종목에 추가 매수(물타기)하지 않는다.",
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
  ruleType: string;
  displayText: string;
  params: object;
  editing?: boolean;
  editText?: string;
  skipped?: boolean;
  source?: "quiz" | "draft"; // quiz는 수정 가능, draft는 불가
}

type Step = "choose" | "quiz" | "draft" | "review" | "done";

const RULE_LABELS: Record<string, string> = {
  CHASE_SURGE: "급등 추격 매수",
  PREMARKET_GAP: "프리마켓 갭업 매수",
  NO_STOP_LOSS: "손절 없는 진입",
  REVENGE_TRADE: "보복 매매",
  MARKET_ORDER_IMPULSE: "충동 시장가 주문",
  AVERAGING_DOWN: "물타기",
};

async function convertLine(text: string): Promise<ConvertedClause | null> {
  const res = await fetch("/api/clauses/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.error) return null;
  return { ruleType: data.ruleType, displayText: data.displayText, params: data.params ?? {} };
}

function splitDraft(draft: string): string[] {
  return draft
    .split(/\n|(?<=[.!?。])\s+/)
    .map((s) => s.replace(/^[-•*\d.]\s*/, "").trim())
    .filter((s) => s.length > 5);
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean>>({});
  const [quizCurrent, setQuizCurrent] = useState(0);
  const [draft, setDraft] = useState("");
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clauses, setClauses] = useState<ConvertedClause[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  function answerQuiz(risky: boolean) {
    const next = { ...quizAnswers, [QUESTIONS[quizCurrent].id]: risky };
    setQuizAnswers(next);
    if (quizCurrent < QUESTIONS.length - 1) {
      setQuizCurrent((c) => c + 1);
    } else {
      proceedToReview(next);
    }
  }

  function proceedToReview(answers: Record<string, boolean>) {
    const quizClauses = QUESTIONS.filter((q) => answers[q.id] === true);
    const finalQuizClauses = quizClauses.length > 0 ? quizClauses : QUESTIONS.slice(0, 2);
    const converted = finalQuizClauses.map((q) => ({
      ruleType: q.id,
      displayText: q.clause,
      params: {},
      source: "quiz" as const,
    }));
    setClauses(converted);
    setStep("review");
  }

  async function handleDraftConfirm() {
    const lines = splitDraft(draft);
    if (lines.length === 0) return;
    setConverting(true);
    setProgress(0);
    setDraftError(null);

    const results: ConvertedClause[] = [];
    let done = 0;
    await Promise.all(
      lines.map(async (line) => {
        const clause = await convertLine(line);
        done++;
        setProgress(Math.round((done / lines.length) * 100));
        if (clause) results.push(clause);
      })
    );

    setConverting(false);

    if (results.length === 0) {
      setDraftError("투자 원칙을 찾을 수 없어요. 나쁜 투자 습관이나 원칙을 다시 적어주세요.");
      return;
    }

    const seen = new Set<string>();
    const deduped = results
      .filter((c) => {
        if (seen.has(c.ruleType)) return false;
        seen.add(c.ruleType);
        return true;
      })
      .map((c) => ({ ...c, source: "draft" as const }));

    setClauses(deduped);
    setStep("review");
  }

  function toggleEdit(i: number) {
    const clause = clauses[i];
    if (clause.source === "draft") return; // draft는 수정 불가
    setClauses((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? { ...c, editing: !c.editing, editText: c.editing ? c.editText : c.displayText }
          : c
      )
    );
  }

  function saveEdit(i: number) {
    setClauses((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, displayText: c.editText ?? c.displayText, editing: false } : c
      )
    );
  }

  function toggleSkip(i: number) {
    setClauses((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, skipped: !c.skipped } : c))
    );
  }

  async function handleFinalConfirm() {
    setSaving(true);
    const active = clauses.filter((c) => !c.skipped);

    const existing = await fetch("/api/clauses").then((r) => r.json());
    await Promise.all(
      existing.map((c: { id: string }) => fetch(`/api/clauses/${c.id}`, { method: "DELETE" }))
    );
    await Promise.all(
      active.map((c) =>
        fetch("/api/clauses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleType: c.ruleType as RuleType, params: c.params, displayText: c.displayText }),
        })
      )
    );

    setSaving(false);
    setStep("done");
    setTimeout(() => router.push("/will"), 1200);
  }

  // ── 선택 단계 ──
  if (step === "choose") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center">
          <div className="mb-8">
            <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">투자 유언장 작성</p>
            <h1 className="text-2xl font-black text-foreground mb-2">어떻게 시작할까요?</h1>
            <OrnamentalDivider />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { setQuizCurrent(0); setStep("quiz"); }}
              className="w-full border border-[#C9A227]/30 bg-[#FDF8EC] hover:bg-[#F5EDD0] px-6 py-4 text-center transition-colors"
            >
              <p className="font-bold text-foreground mb-1">퀴즈로 시작</p>
              <p className="text-xs text-muted-foreground">5가지 상황으로 나의 나쁜 습관 진단</p>
            </button>
            <button
              onClick={() => setStep("draft")}
              className="w-full border border-border bg-card hover:bg-muted px-6 py-4 text-center transition-colors"
            >
              <p className="font-bold text-foreground mb-1">자유롭게 작성</p>
              <p className="text-xs text-muted-foreground">나쁜 투자 습관을 직접 입력하기</p>
            </button>
          </div>

          <Link href="/will" className="block text-xs text-muted-foreground hover:text-foreground mt-6">
            건너뛰기
          </Link>
        </div>
      </div>
    );
  }

  // ── 퀴즈 단계 ──
  if (step === "quiz") {
    const q = QUESTIONS[quizCurrent];
    const prog = (quizCurrent / QUESTIONS.length) * 100;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="border border-[#C9A227]/40">
            <div className="bg-[#FDF8EC] px-6 pt-6 pb-4 text-center border-b border-[#C9A227]/20">
              <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-2">투자 습관 진단</p>
              <h2 className="text-xl font-black text-foreground tracking-tight mb-3">투 자 습 관 진 단</h2>
              <OrnamentalDivider />
            </div>
            <div className="h-0.5 bg-muted">
              <div className="h-full bg-[#C9A227] transition-all" style={{ width: `${prog}%` }} />
            </div>
            <div className="px-6 py-6">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider mb-4">
                {quizCurrent + 1} / {QUESTIONS.length}
              </p>
              <p className="text-base font-bold text-foreground mb-5 leading-relaxed">{q.q}</p>
              <div className="space-y-2 mb-4">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => answerQuiz(opt.risky)}
                    className="w-full text-left px-4 py-3 border border-border bg-background hover:border-[#C9A227]/50 hover:bg-[#FDF8EC] transition-all text-sm text-foreground"
                  >
                    <span className="font-bold text-[#C9A227]">{String.fromCharCode(65 + i)}.</span> {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { proceedToReview(quizAnswers); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
              >
                건너뛰기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 드래프트 단계 ──
  if (step === "draft") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">자유로운 작성</p>
            <h1 className="text-2xl font-black text-foreground mb-2">나쁜 투자 습관을 적어보세요</h1>
            <OrnamentalDivider />
            <p className="text-sm text-muted-foreground mt-3">
              형식 상관없이 자유롭게. 한 줄에 하나씩 쓰면 더 잘 인식해요.
            </p>
          </div>

          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setDraftError(null); }}
            placeholder="- 급등 종목 보면 바로 시장가로 들어가는 습관이 있어&#10;- 손절을 항상 미루게 돼. 기다리면 오를 것 같아서&#10;- 하락 중인 종목에 계속 물타기 해왔음"
            rows={10}
            className="w-full border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#C9A227]/60 resize-none leading-relaxed"
          />

          {draftError && (
            <p className="mt-3 text-xs text-[#B83535] bg-[#FDF0F0] border border-[#B83535]/20 px-3 py-2">
              {draftError}
            </p>
          )}

          <div className="flex items-center justify-between mt-4">
            <Link href="/will" className="text-xs text-muted-foreground hover:text-foreground">
              건너뛰기
            </Link>
            <button
              onClick={handleDraftConfirm}
              disabled={converting || draft.trim().length < 5}
              className="flex items-center gap-2 bg-foreground text-background px-6 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40"
            >
              {converting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {progress}%
                </>
              ) : (
                "확정하기 →"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 검토/수정 단계 ──
  if (step === "review") {
    const activeCount = clauses.filter((c) => !c.skipped).length;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="mb-6 text-center">
            <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">검토</p>
            <h1 className="text-2xl font-black text-foreground mb-2">유언장 초안</h1>
            <OrnamentalDivider />
            <p className="text-sm text-muted-foreground mt-3">
              내용을 확인하고 수정하세요.
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {clauses.map((c, i) => (
              <div
                key={i}
                className={`border px-4 py-3 transition-all ${
                  c.skipped
                    ? "border-border bg-muted/30 opacity-40"
                    : "border-[#C9A227]/30 bg-[#FDF8EC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-[#C9A227] tracking-wider uppercase mb-1">
                      {RULE_LABELS[c.ruleType] ?? c.ruleType}
                    </p>
                    {c.editing ? (
                      <div className="flex gap-2 items-start">
                        <textarea
                          value={c.editText}
                          onChange={(e) =>
                            setClauses((prev) =>
                              prev.map((cl, idx) => (idx === i ? { ...cl, editText: e.target.value } : cl))
                            )
                          }
                          rows={2}
                          className="flex-1 border border-border bg-card px-2 py-1 text-sm text-foreground focus:outline-none resize-none"
                        />
                        <button onClick={() => saveEdit(i)} className="mt-0.5 p-1">
                          <Check size={13} className="text-[#3D9E72]" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-foreground">{c.displayText}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!c.skipped && !c.editing && c.source === "quiz" && (
                      <button onClick={() => toggleEdit(i)} className="p-1">
                        <Edit2 size={11} className="text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => toggleSkip(i)} className="p-1">
                      <X size={11} className={c.skipped ? "text-[#3D9E72]" : "text-muted-foreground"} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("choose")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← 다시 선택
            </button>
            <button
              onClick={handleFinalConfirm}
              disabled={saving || activeCount === 0}
              className="flex items-center gap-2 bg-foreground text-background px-6 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? "저장 중..." : `진짜 확정 (${activeCount}개)`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 단계 ──
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#3D9E72] text-4xl mb-3">✓</p>
        <p className="text-lg font-black text-foreground">유언장이 확정되었습니다.</p>
        <p className="text-sm text-muted-foreground mt-1">유언장으로 이동합니다...</p>
      </div>
    </div>
  );
}
