"use client";

import { useState } from "react";
import { CheckCircle, X, Loader2 } from "lucide-react";
import type { SuggestionStatus } from "@prisma/client";

interface Props {
  suggestion: {
    id: string;
    status: SuggestionStatus;
  };
}

export function SuggestionActions({ suggestion }: Props) {
  const [status, setStatus] = useState<SuggestionStatus>(suggestion.status);
  const [loading, setLoading] = useState(false);

  async function act(next: "APPROVED" | "REJECTED") {
    setLoading(true);
    await fetch(`/api/clauses/suggestions/${suggestion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatus(next);
    setLoading(false);
  }

  if (status === "APPROVED") {
    return (
      <span className="text-[9px] font-bold text-[#3D9E72] bg-[#EBF7F3] px-2 py-1 tracking-wider shrink-0">
        유언장에 추가됨
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="text-[9px] text-muted-foreground tracking-wider shrink-0">거절됨</span>
    );
  }

  return (
    <div className="flex gap-1.5 shrink-0">
      <button
        onClick={() => act("APPROVED")}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#3D9E72] border border-[#3D9E72]/30 px-2.5 py-1 hover:bg-[#EBF7F3] transition-colors disabled:opacity-40"
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
        유언장에 추가
      </button>
      <button
        onClick={() => act("REJECTED")}
        disabled={loading}
        className="inline-flex items-center justify-center text-muted-foreground border border-border px-2 py-1 hover:bg-muted transition-colors disabled:opacity-40"
      >
        <X size={10} />
      </button>
    </div>
  );
}
