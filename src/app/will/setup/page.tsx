"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, X, Check, Edit2 } from "lucide-react";
import { OrnamentalDivider } from "@/components/cert-ui";
import { RuleType } from "@prisma/client";

type Step = "draft" | "review" | "done";

interface ConvertedClause {
  ruleType: string;
  displayText: string;
  params: object;
  editing?: boolean;
  editText?: string;
  skipped?: boolean;
}

const RULE_LABELS: Record<string, string> = {
  CHASE_SURGE: "급등 추격 매수",
  PREMARKET_GAP: "프리마켓 갭업 매수",
  NO_STOP_LOSS: "손절 없는 진입",
  REVENGE_TRADE: "보복 매매",
  MARKET_ORDER_IMPULSE: "충동 시장가 주문",
  AVERAGING_DOWN: "물타기",
};

const DRAFT_PLACEHOLDER = `예시:
- 급등 종목 보면 바로 시장가로 들어가는 습관이 있어
- 손절을 항상 미루게 돼. 기다리면 오를 것 같아서
- 손실 나면 같은 날 바로 다시 들어가서 본전 찾으려 함
- 하락 중인 종목에 계속 물타기 해왔음`;

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
  const [step, setStep] = useState<Step>("draft");
  const [draft, setDraft] = useState("");
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clauses, setClauses] = useState<ConvertedClause[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    const lines = splitDraft(draft);
    if (lines.length === 0) return;
    setConverting(true);
    setProgress(0);

    const results: ConvertedClause[] = [];
    // 병렬 호출, 진행률 표시
    let done = 0;
    await Promise.all(
      lines.map(async (line) => {
        const clause = await convertLine(line);
        done++;
        setProgress(Math.round((done / lines.length) * 100));
        if (clause) results.push(clause);
      })
    );

    // ruleType 중복 제거 (같은 패턴은 첫 번째만)
    const seen = new Set<string>();
    const deduped = results.filter((c) => {
      if (seen.has(c.ruleType)) return false;
      seen.add(c.ruleType);
      return true;
    });

    setClauses(deduped);
    setConverting(false);
    setStep("review");
  }

  function toggleEdit(i: number) {
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

    // 기존 조항 전부 삭제 후 새로 저장
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

  // ── 드래프트 입력 ──
  if (step === "draft") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">투자 유언장 작성</p>
            <h1 className="text-2xl font-black text-foreground mb-2">나쁜 투자 습관을 적어보세요</h1>
            <OrnamentalDivider />
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              형식 상관없이 자유롭게. 한 줄에 하나씩 쓰면 더 잘 인식해요.
            </p>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={DRAFT_PLACEHOLDER}
            rows={10}
            className="w-full border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#C9A227]/60 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between mt-4">
            <Link href="/will" className="text-xs text-muted-foreground hover:text-foreground">
              건너뛰기
            </Link>
            <button
              onClick={handleConfirm}
              disabled={converting || draft.trim().length < 5}
              className="flex items-center gap-2 bg-foreground text-background px-6 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {converting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  분석 중 {progress}%
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

  // ── 검토/수정 ──
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
              내용을 확인하고 수정하세요. 빼고 싶은 조항은 제외할 수 있어요.
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
                        <button onClick={() => saveEdit(i)} className="mt-0.5 p-1 hover:bg-[#3D9E72]/10">
                          <Check size={13} className="text-[#3D9E72]" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-foreground">{c.displayText}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {!c.skipped && !c.editing && (
                      <button onClick={() => toggleEdit(i)} className="p-1 hover:bg-muted">
                        <Edit2 size={11} className="text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => toggleSkip(i)} className="p-1 hover:bg-muted">
                      <X size={11} className={c.skipped ? "text-[#3D9E72]" : "text-muted-foreground"} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("draft")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← 다시 작성
            </button>
            <button
              onClick={handleFinalConfirm}
              disabled={saving || activeCount === 0}
              className="flex items-center gap-2 bg-foreground text-background px-6 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? "저장 중..." : `진짜 확정 (${activeCount}개)`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 ──
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
