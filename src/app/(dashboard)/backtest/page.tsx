"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

interface ReturnStats {
  mean: number;
  median: number;
  win_rate: number;
  worst: number;
  best: number;
  n: number;
}

interface MddStats {
  mean: number;
  median: number;
  worst: number;
  pct_over_5: number;
  pct_over_10: number;
  n: number;
}

interface BacktestResult {
  rule: string;
  market: string;
  total_signals: number;
  returns: Record<string, ReturnStats>;
  mdd?: MddStats;
  recent_dates?: string[];
}

interface BacktestData {
  results: BacktestResult[];
  horizons: number[];
}

const RULE_LABELS: Record<string, string> = {
  CHASE_SURGE: "급등 추격 매수",
  PREMARKET_GAP: "프리마켓 갭업 매수",
  REVENGE_TRADE: "보복 매매",
  MARKET_ORDER_IMPULSE: "충동 시장가 주문",
  AVERAGING_DOWN: "물타기",
  NO_STOP_LOSS: "손절 없는 진입",
};

const MARKET_LABELS: Record<string, string> = {
  us: "미국",
  kr: "국내",
  crypto: "코인",
};

const HORIZONS = [5, 10, 20];

export default function BacktestPage() {
  const [data, setData] = useState<BacktestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>("us");
  const [selectedHorizon, setSelectedHorizon] = useState<number>(10);

  useEffect(() => {
    fetch("/api/backtest")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
  }, []);

  const filtered = data?.results.filter((r) => r.market === selectedMarket) ?? [];

  if (error) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-sm text-[#B83535]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-foreground mb-1">유언장 백테스트</h1>
          <p className="text-sm text-muted-foreground">
            조항별 위반 패턴이 실제로 얼마나 손해를 유발하는지 과거 데이터로 검증합니다.
          </p>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex border border-border">
            {Object.entries(MARKET_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedMarket(key)}
                className={`px-4 py-2 text-xs font-bold transition-all ${
                  selectedMarket === key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex border border-border">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHorizon(h)}
                className={`px-4 py-2 text-xs font-bold transition-all ${
                  selectedHorizon === h
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {h}일 후
              </button>
            ))}
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="space-y-4">
          {filtered.map((result) => {
            const stats = result.returns[String(selectedHorizon)];
            const isNoStopLoss = result.rule === "NO_STOP_LOSS";
            const positive = !isNoStopLoss && stats?.mean > 0;

            return (
              <div key={`${result.market}-${result.rule}`} className="border border-border bg-card">
                {/* 타이틀 바 */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-[#C9A227]" />
                    <span className="text-sm font-black text-foreground">
                      {RULE_LABELS[result.rule] ?? result.rule}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5">
                      {result.rule}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    총 <strong className="text-foreground">{result.total_signals.toLocaleString()}</strong>건 감지
                  </span>
                </div>

                <div className="px-5 py-4">
                  {isNoStopLoss && result.mdd ? (
                    /* NO_STOP_LOSS — MDD 뷰 */
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mb-3">
                        급등 진입 후 20일 내 최대 낙폭 분포
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "평균 MDD", value: `${result.mdd.mean}%`, color: "text-[#B83535]" },
                          { label: "중간값 MDD", value: `${result.mdd.median}%`, color: "text-[#B83535]" },
                          { label: "-5% 이상 낙폭", value: `${result.mdd.pct_over_5}%`, color: "text-[#B83535]" },
                          { label: "-10% 이상 낙폭", value: `${result.mdd.pct_over_10}%`, color: "text-[#B83535]" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="border border-border p-3">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
                            <p className={`text-lg font-black ${color}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        손절가 없이 급등 종목 진입 시 {result.mdd.pct_over_5}%의 경우 -5% 이상 낙폭을 경험합니다.
                      </p>
                    </div>
                  ) : stats ? (
                    /* 일반 룰 — 수익률 뷰 */
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mb-3">
                        위반 다음날 진입 → {selectedHorizon}일 후 수익률
                      </p>
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        {[
                          { label: "평균 수익률", value: `${stats.mean > 0 ? "+" : ""}${stats.mean}%`, highlight: true },
                          { label: "중간값", value: `${stats.median > 0 ? "+" : ""}${stats.median}%`, highlight: false },
                          { label: "승률", value: `${stats.win_rate}%`, highlight: false },
                          { label: "하위 5%", value: `${stats.worst}%`, highlight: false },
                          { label: "상위 5%", value: `+${stats.best}%`, highlight: false },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="border border-border p-3">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
                            <p className={`text-base font-black ${
                              highlight
                                ? positive ? "text-[#3D9E72]" : "text-[#B83535]"
                                : "text-foreground"
                            }`}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* 수익률 막대 시각화 */}
                      <div className="flex items-center gap-2">
                        <TrendingDown size={11} className="text-[#B83535] shrink-0" />
                        <div className="flex-1 h-2 bg-muted relative overflow-hidden">
                          <div
                            className={`h-full absolute top-0 ${positive ? "bg-[#3D9E72]" : "bg-[#B83535]"}`}
                            style={{ width: `${Math.min(Math.abs(stats.win_rate), 100)}%`, left: 0 }}
                          />
                        </div>
                        <TrendingUp size={11} className="text-[#3D9E72] shrink-0" />
                        <span className="text-[10px] text-muted-foreground w-12 text-right">
                          승률 {stats.win_rate}%
                        </span>
                      </div>

                      {stats.n > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {stats.n.toLocaleString()}개 샘플 기준
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* 안내 */}
        <div className="mt-6 bg-[#FDF8EC] border border-[#C9A227]/30 px-4 py-3 flex items-start gap-3">
          <BarChart2 size={13} className="text-[#C9A227] mt-0.5 shrink-0" />
          <p className="text-xs text-[#7A5F0E] leading-relaxed">
            위반 다음날 매수 → N일 후 청산을 가정한 단순 백테스트입니다. 슬리피지·수수료 미반영.
            데이터 기간: 2022–2026년. 재실행: <code className="font-mono bg-[#F5EDD0] px-1">python -m pipelines.backtest</code>
          </p>
        </div>
      </div>
    </div>
  );
}
