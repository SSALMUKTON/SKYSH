"use client";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onProceed: () => void;
}

export function WillPrecheckModal({ onClose, onProceed }: Props) {
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
            현재 주문은 유언장 <strong style={{ color: "#EF9090" }}>제2조</strong>를 위반할 가능성이 있습니다.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4" style={{ borderLeft: "3px solid rgba(201,162,39,0.5)", paddingLeft: 14 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(201,162,39,0.7)", marginBottom: 6 }}>
              유언장 제2조 全文
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#F5F0E6", lineHeight: 1.7, fontStyle: "italic" }}>
              &ldquo;나는 프리마켓 갭상 직후 시장가로 매수하지 않는다.&rdquo;
            </p>
          </div>

          <div className="mb-5" style={{ border: "1px solid rgba(245,240,230,0.08)" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(245,240,230,0.4)", padding: "8px 12px", borderBottom: "1px solid rgba(245,240,230,0.08)", textTransform: "uppercase" }}>
              현황 증거
            </p>
            {[
              { label: "거래 시간", value: "프리마켓", warn: true },
              { label: "전일 종가 대비 상승률", value: "+8.4%", warn: true },
              { label: "주문 방식", value: "시장가 매수", warn: true },
              { label: "손절 기준", value: "미입력", warn: true },
              { label: "과거 유사 거래", value: "3회 중 2회 손실 (66.7%)", warn: false },
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-center px-3 py-2" style={{ borderBottom: "1px solid rgba(245,240,230,0.06)" }}>
                <span style={{ fontSize: 11, color: "rgba(245,240,230,0.45)" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: warn ? "#E07070" : "rgba(245,240,230,0.75)" }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {["10분 뒤 다시 보기", "지정가 주문으로 변경", "매수 금액 줄이기", "손절 기준 먼저 작성"].map((label) => (
              <button
                key={label}
                onClick={onClose}
                className="w-full py-2.5 text-sm font-medium transition-colors"
                style={{ border: "1px solid rgba(245,240,230,0.12)", color: "rgba(245,240,230,0.65)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,240,230,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {label}
              </button>
            ))}
            <button
              onClick={onProceed}
              className="w-full py-3 text-sm font-black tracking-wider transition-opacity hover:opacity-85"
              style={{ background: "#B83535", color: "#fff", letterSpacing: "0.1em" }}
            >
              그래도 주문하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
