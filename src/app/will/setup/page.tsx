"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, CheckCircle } from "lucide-react";
import { OrnamentalDivider } from "@/components/cert-ui";
import { SETUP_CLAUSES } from "@/lib/mock-data";

export default function WillSetupPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) { next.delete(i); } else { next.add(i); }
    setSelected(next);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-12 py-4 border-b border-border">
        <Link href="/" className="text-lg font-black text-foreground">故래소</Link>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">첫 투자 유언장 작성</span>
      </header>

      <main className="flex-1 flex items-start justify-center py-12 px-8">
        <div className="w-full max-w-lg">
          <div className="border border-[#C9A227]/40 border-b-0 bg-[#FDF8EC] px-8 pt-7 pb-5">
            <div className="text-center">
              <p className="text-[9px] font-bold tracking-[0.3em] text-[#C9A227] uppercase mb-3">나의 첫 투자 유언장</p>
              <h2 className="text-xl font-black text-foreground mb-3 tracking-tight">투 자 유 언 장 작 성</h2>
              <OrnamentalDivider />
              <p className="text-xs text-[#7A5F0E]/80 leading-relaxed mt-2">
                아래의 조항을 선택함으로써 귀하는 이를 투자 원칙으로 준수할 것을<br />스스로에게 엄숙히 서약합니다.
              </p>
            </div>
          </div>

          <div className="border-x border-[#C9A227]/40 bg-card px-6 py-4 space-y-2">
            {SETUP_CLAUSES.map((clause, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border text-left transition-all ${
                  selected.has(i) ? "border-[#C9A227]/50 bg-[#FDF8EC]" : "border-border bg-background hover:border-foreground/15"
                }`}
              >
                <div
                  className="mt-0.5 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    width: 18, height: 18,
                    border: `2px solid ${selected.has(i) ? "#C9A227" : "rgba(26,23,32,0.2)"}`,
                    background: selected.has(i) ? "#C9A227" : "transparent",
                  }}
                >
                  {selected.has(i) && <CheckCircle size={11} className="text-white" />}
                </div>
                <span className="text-sm text-foreground leading-relaxed">
                  <span className="font-black text-[#C9A227]">제{i + 1}조.</span>{" "}
                  {clause}
                </span>
              </button>
            ))}
          </div>

          <div className="border border-[#C9A227]/40 border-t-0 bg-[#FDF8EC] px-8 py-5">
            <OrnamentalDivider />
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#7A5F0E]/70">
                선택한 조항: <span className="font-black text-[#C9A227]">{selected.size}개</span>
              </p>
              <p className="text-xs text-[#7A5F0E]/70">2026년 6월 28일 서약</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              disabled={selected.size === 0}
              className="w-full bg-foreground text-background py-3.5 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              유언장 저장하기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
