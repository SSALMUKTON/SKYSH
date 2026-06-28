"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, X, Loader2 } from "lucide-react";
import { OrnamentalDivider, CertSeal } from "@/components/cert-ui";
import { RuleType } from "@prisma/client";

interface Clause {
  id: string;
  ruleType: RuleType;
  params: Record<string, unknown>;
  displayText: string;
  violationCount: number;
  createdAt: string;
}

const RULE_LABELS: Record<string, string> = {
  CHASE_SURGE: "급등 추격 매수",
  PREMARKET_GAP: "프리마켓 갭업 매수",
  NO_STOP_LOSS: "손절 없는 진입",
  REVENGE_TRADE: "보복 매매",
  MARKET_ORDER_IMPULSE: "충동 시장가 주문",
  AVERAGING_DOWN: "물타기",
};

export default function WillPage() {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState("");
  const [converting, setConverting] = useState(false);
  const [preview, setPreview] = useState<{ ruleType: string; displayText: string } | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clauses")
      .then((r) => r.json())
      .then(setClauses);
  }, []);

  async function convertClause() {
    if (!inputText.trim()) return;
    setConverting(true);
    setConvertError(null);
    setPreview(null);
    const res = await fetch("/api/clauses/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputText.trim() }),
    });
    const data = await res.json();
    setConverting(false);
    if (data.error) {
      setConvertError(data.error);
    } else {
      setPreview({ ruleType: data.ruleType, displayText: data.displayText });
    }
  }

  async function addClause() {
    if (!preview) return;
    const res = await fetch("/api/clauses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleType: preview.ruleType, params: {}, displayText: preview.displayText }),
    });
    const created = await res.json();
    setClauses((prev) => [...prev, created]);
    setInputText("");
    setPreview(null);
    setShowAddForm(false);
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/clauses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayText: editText }),
    });
    const updated = await res.json();
    setClauses((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
  }

  async function deleteClause(id: string) {
    await fetch(`/api/clauses/${id}`, { method: "DELETE" });
    setClauses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">나의 투자 유언장</h2>
            <p className="text-sm text-muted-foreground mt-1">
              총 {clauses.length}개 조항
            </p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-2 bg-[#FDF8EC] border border-[#C9A227]/40 text-[#7A5F0E] px-4 py-2 text-sm font-bold hover:bg-[#F5EDD0] transition-colors"
          >
            <Plus size={13} />
            새 조항 추가
          </button>
        </div>

        {/* 조항 추가 폼 */}
        {showAddForm && (
          <div className="mb-4 border border-[#C9A227]/30 bg-[#FDF8EC] p-4 space-y-3">
            <p className="text-[10px] font-bold text-[#7A5F0E] tracking-wider uppercase">나쁜 투자 습관을 자연어로 적어주세요</p>
            <div className="flex gap-2">
              <input
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); setPreview(null); setConvertError(null); }}
                onKeyDown={(e) => e.key === "Enter" && convertClause()}
                placeholder="예: 급등 종목 보면 바로 시장가로 들어가는 습관이 있어"
                className="flex-1 border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
              />
              <button
                onClick={convertClause}
                disabled={converting || !inputText.trim()}
                className="px-4 py-2 text-xs font-bold bg-foreground text-background hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
              >
                {converting ? <Loader2 size={12} className="animate-spin" /> : null}
                {converting ? "변환 중" : "변환"}
              </button>
            </div>

            {convertError && (
              <p className="text-xs text-[#B83535]">{convertError}</p>
            )}

            {preview && (
              <div className="border border-[#C9A227]/50 bg-white px-4 py-3 space-y-1">
                <p className="text-[9px] font-bold text-[#C9A227] tracking-wider uppercase">
                  {RULE_LABELS[preview.ruleType] ?? preview.ruleType}
                </p>
                <p className="text-sm font-bold text-foreground">"{preview.displayText}"</p>
                <p className="text-[10px] text-muted-foreground pt-1">이 조항으로 추가할까요?</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddForm(false); setInputText(""); setPreview(null); setConvertError(null); }}
                className="px-3 py-1.5 text-xs text-muted-foreground border border-border hover:bg-muted"
              >
                취소
              </button>
              {preview && (
                <button onClick={addClause} className="px-3 py-1.5 text-xs font-bold bg-foreground text-background hover:opacity-90">
                  추가
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border border-[#C9A227]/40 p-0.5">
          <div className="border border-[#C9A227]/20 bg-[#FDFAF6]">
            <div className="relative px-10 pt-8 pb-6 text-center" style={{ borderBottom: "2px double rgba(201,162,39,0.2)" }}>
              <div className="absolute top-5 right-7">
                <CertSeal color="#C9A227" line1="투자자" line2="유언장" rotate={-8} />
              </div>
              <p className="text-[9px] font-black tracking-[0.4em] text-[#C9A227] uppercase mb-3">투자자 공식 유언장</p>
              <h2 className="text-2xl font-black text-foreground tracking-[0.15em] mb-1">투 자 유 언 장</h2>
              <OrnamentalDivider />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                나는 투자자로서 아래와 같은 원칙을 스스로에게 선언하며,<br />
                이를 매 거래 전 유언장으로써 읽고 준수할 것을 엄숙히 서약합니다.
              </p>
            </div>

            <div className="px-10 py-4">
              {clauses.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">조항이 없습니다. 추가해보세요.</p>
              )}
              {clauses.map(({ id, ruleType, displayText, violationCount }, i) => (
                <div key={id}>
                  <div className="flex items-start gap-5 py-4">
                    <span className="text-[11px] font-black text-[#C9A227] tracking-wider w-12 shrink-0 pt-0.5">
                      제{i + 1}조
                    </span>
                    <div className="flex-1 min-w-0">
                      {editingId === id ? (
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full border border-border bg-card px-2 py-1 text-sm text-foreground focus:outline-none mb-1"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm text-foreground leading-relaxed mb-1.5">{displayText}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] text-muted-foreground tracking-wide">{ruleType}</span>
                        <span className={`text-[9px] font-black tracking-wider ${violationCount > 0 ? "text-[#B83535]" : "text-[#3D9E72]"}`}>
                          {violationCount > 0 ? `위반 ${violationCount}회` : "위반 없음"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {editingId === id ? (
                        <>
                          <button onClick={() => saveEdit(id)} className="p-2 text-[#3D9E72] hover:bg-muted"><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground hover:bg-muted"><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(id); setEditText(displayText); }} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 size={12} /></button>
                          <button onClick={() => deleteClause(id)} className="p-2 text-muted-foreground hover:text-[#B83535] hover:bg-muted"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  {i < clauses.length - 1 && <div className="border-b border-dashed border-foreground/10" />}
                </div>
              ))}
            </div>

            <div className="px-10 py-6" style={{ borderTop: "2px double rgba(201,162,39,0.2)" }}>
              <OrnamentalDivider />
              <p className="text-[9px] text-muted-foreground/50 text-center mt-3">
                이 유언장은 주문 전마다 자동으로 낭독됩니다 · 故래소 거래 분석 시스템 보관
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
