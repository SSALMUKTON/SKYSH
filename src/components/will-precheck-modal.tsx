"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { Quote } from "@/lib/broker/types";
import type { OrderDraft, SuggestedAction, Violation } from "@/lib/rules/types";

interface Props {
  violations: Violation[];
  quote: Quote;
  draft: OrderDraft;
  /** 비강행 선택지 (postpone/switch_limit/reduce_amount/set_stop_loss). */
  onAction: (action: SuggestedAction) => void;
  /** 강행 — 사유와 함께. */
  onForce: (reason: string) => void;
  onClose: () => void;
}

const ACTION_LABEL: Record<Exclude<SuggestedAction, "force">, string> = {
  postpone: "10분 뒤 다시 보기",
  switch_limit: "지정가 주문으로 변경",
  reduce_amount: "매수 금액 줄이기",
  set_stop_loss: "손절 기준 먼저 작성",
};

export function WillPrecheckModal({ violations, quote, draft, onAction, onForce, onClose }: Props) {
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  // 위반들의 선택지 합집합 (force 는 별도 하단 버튼으로).
  const actions = Array.from(new Set(violations.flatMap((v) => v.actions)));
  const softActions = actions.filter((a): a is Exclude<SuggestedAction, "force"> => a !== "force");
  const canForce = actions.includes("force");

  const evidence: { label: string; value: string; warn: boolean }[] = [
    { label: "거래 시간", value: quote.isPremarket ? "프리마켓" : "정규장", warn: !!quote.isPremarket },
    {
      label: "전일 종가 대비",
      value: `${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(1)}%`,
      warn: quote.changePct >= 15,
    },
    {
      label: "주문 방식",
      value: `${draft.orderType === "MARKET" ? "시장가" : "지정가"} ${draft.side === "BUY" ? "매수" : "매도"}`,
      warn: draft.orderType === "MARKET",
    },
    {
      label: "손절 기준",
      value: draft.stopPrice != null ? `$${draft.stopPrice}` : "미입력",
      warn: draft.stopPrice == null,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 6, 14, 0.82)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{ background: "#0D0B16", border: "1px solid rgba(201,162,39,0.25)" }}
      >
        <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 18 }}>🕯️</span>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: "rgba(201,162,39,0.7)" }}>
                  유언장 낭독 의식
                </p>
              </div>
              <h3 className="text-xl font-black tracking-tight" style={{ color: "#F5F0E6" }}>
                투자 유언장 낭독
              </h3>
              <p style={{ color: "rgba(245,240,230,0.35)", fontSize: 11, marginTop: 2 }}>
                주문 실행 전, 과거의 당신이 남긴 유언을 읽겠습니다.
              </p>
            </div>
            <button onClick={onClose} style={{ color: "rgba(245,240,230,0.3)" }} className="hover:opacity-70 transition-opacity mt-0.5">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3" style={{ background: "rgba(184,53,53,0.15)", borderBottom: "1px solid rgba(184,53,53,0.25)" }}>
          <p style={{ color: "#E07070", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            현재 주문은 유언장 <strong style={{ color: "#EF9090" }}>{violations.length}개 조항</strong>을 위반할 가능성이 있습니다.
          </p>
        </div>

        <div className="px-6 py-5">
          {/* 위반 조항 문구 */}
          {violations.map((v) => (
            <div key={v.clauseId} className="mb-4" style={{ borderLeft: "3px solid rgba(201,162,39,0.5)", paddingLeft: 14 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(201,162,39,0.7)", marginBottom: 6 }}>
                {v.ruleType}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E6", lineHeight: 1.7, fontStyle: "italic" }}>
                &ldquo;{v.message}&rdquo;
              </p>
            </div>
          ))}

          {/* 현황 증거 */}
          <div className="mb-5" style={{ border: "1px solid rgba(245,240,230,0.08)" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(245,240,230,0.4)", padding: "8px 12px", borderBottom: "1px solid rgba(245,240,230,0.08)", textTransform: "uppercase" }}>
              현황 증거
            </p>
            {evidence.map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-center px-3 py-2" style={{ borderBottom: "1px solid rgba(245,240,230,0.06)" }}>
                <span style={{ fontSize: 11, color: "rgba(245,240,230,0.45)" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: warn ? "#E07070" : "rgba(245,240,230,0.75)" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* 선택지 */}
          <div className="space-y-2">
            {softActions.map((action) => (
              <button
                key={action}
                onClick={() => onAction(action)}
                className="w-full py-2.5 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(245,240,230,0.12)", color: "rgba(245,240,230,0.65)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,240,230,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {ACTION_LABEL[action]}
              </button>
            ))}

            {canForce && !showReason && (
              <button
                onClick={() => setShowReason(true)}
                className="w-full py-3 text-sm font-black tracking-wider transition-opacity hover:opacity-85"
                style={{ background: "#B83535", color: "#fff", letterSpacing: "0.1em" }}
              >
                그래도 주문하기
              </button>
            )}

            {canForce && showReason && (
              <div className="space-y-2 pt-1">
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(245,240,230,0.5)", textTransform: "uppercase" }}>
                  강행 사유 (필수)
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="유언을 어기고 진행하는 이유를 남기세요. 이 기록은 거래 후 보고서에 남습니다."
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "rgba(245,240,230,0.05)", border: "1px solid rgba(245,240,230,0.15)", color: "#F5F0E6", resize: "none" }}
                />
                <button
                  onClick={() => onForce(reason.trim())}
                  disabled={reason.trim().length === 0}
                  className="w-full py-3 text-sm font-black tracking-wider transition-opacity"
                  style={{
                    background: reason.trim().length === 0 ? "rgba(184,53,53,0.4)" : "#B83535",
                    color: "#fff",
                    letterSpacing: "0.1em",
                    cursor: reason.trim().length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  사유 기록하고 강행
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
