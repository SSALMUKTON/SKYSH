"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingDown, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";

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
}

interface Clause {
  id: string;
  ruleType: string;
  displayText: string;
}

const RULE_LABELS: Record<string, string> = {
  CHASE_SURGE: "급등 추격 매수",
  PREMARKET_GAP: "프리마켓 갭업 매수",
  REVENGE_TRADE: "보복 매매",
  MARKET_ORDER_IMPULSE: "충동 시장가 주문",
  AVERAGING_DOWN: "물타기",
  NO_STOP_LOSS: "손절 없는 진입",
};

const MARKET_LABELS: Record<string, string> = { us: "미국", kr: "국내", crypto: "코인" };
const HORIZONS = [20, 60, 120];

const PERIOD_OPTIONS = ["전체", "2020-2021 상승장", "2022 하락장", "2023-2024 반등장"];

export default function BacktestPage() {
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>("us");
  const [selectedHorizon, setSelectedHorizon] = useState<number>(60);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("전체");
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  useEffect(() => {
    // 사용 가능한 기간 목록
    fetch("/api/backtest?period=list")
      .then((r) => r.json())
      .then((d) => setAvailablePeriods(d.periods ?? []));

    fetch(`/api/backtest?period=${encodeURIComponent("전체")}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setResults(d.results); });

    fetch("/api/clauses")
      .then((r) => r.json())
      .then((cs: Clause[]) => {
        setClauses(cs);
        if (cs.length > 0) setSelectedClause(cs[0]);
      });
  }, []);

  function changePeriod(period: string) {
    setSelectedPeriod(period);
    setLoadingPeriod(true);
    setError(null);
    fetch(`/api/backtest?period=${encodeURIComponent(period)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setResults(d.results);
      })
      .finally(() => setLoadingPeriod(false));
  }

  // 선택된 조항 + 시장의 백테스트 결과
  const result = results.find(
    (r) => r.rule === selectedClause?.ruleType && r.market === selectedMarket
  ) ?? null;

  const hasData = result && result.total_signals > 0;
  const stats = result?.returns[String(selectedHorizon)];
  const isNoStopLoss = selectedClause?.ruleType === "NO_STOP_LOSS";

  // 백테스트 데이터 없는 조항
  const backtestableRules = new Set(results.map((r) => r.rule));

  if (error) return (
    <div className="p-10 max-w-3xl mx-auto">
      <p className="text-sm text-[#B83535]">{error}</p>
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground mb-1">유언장 백테스트</h1>
          <p className="text-sm text-muted-foreground mb-4">
            조항을 선택하면 해당 패턴의 과거 수익률 데이터를 보여줍니다.
          </p>
          {/* 기간 선택 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">기간</span>
            <div className="flex border border-border">
              {PERIOD_OPTIONS.map((p) => {
                const available = availablePeriods.includes(p);
                const active = selectedPeriod === p;
                return (
                  <button
                    key={p}
                    onClick={() => available && changePeriod(p)}
                    disabled={!available}
                    className={`px-3 py-1.5 text-xs font-bold transition-all border-r border-border last:border-r-0 ${
                      active
                        ? "bg-foreground text-background"
                        : available
                        ? "text-muted-foreground hover:bg-muted"
                        : "text-muted-foreground/30 cursor-not-allowed"
                    }`}
                    title={!available ? "python -m pipelines.backtest --period \"" + p + "\" 실행 필요" : undefined}
                  >
                    {p}
                    {!available && <span className="ml-1 text-[9px]">미실행</span>}
                  </button>
                );
              })}
            </div>
            {loadingPeriod && <span className="text-xs text-muted-foreground">로딩 중...</span>}
          </div>
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-6">
          {/* 왼쪽: 조항 목록 */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">내 유언장</p>
            <div className="space-y-1">
              {clauses.length === 0 && (
                <p className="text-xs text-muted-foreground">유언장이 없습니다.</p>
              )}
              {clauses.filter((c) => backtestableRules.has(c.ruleType)).map((c) => {
                const active = selectedClause?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClause(c)}
                    className={`w-full text-left px-3 py-3 border transition-all flex items-start justify-between gap-2 ${
                      active
                        ? "border-[#C9A227]/60 bg-[#FDF8EC]"
                        : "border-border bg-card hover:border-[#C9A227]/30 hover:bg-[#FDF8EC]/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-[#C9A227] mb-0.5">
                        {RULE_LABELS[c.ruleType] ?? c.ruleType}
                      </p>
                      <p className="text-[11px] text-foreground leading-relaxed break-keep">{c.displayText}</p>
                    </div>
                    <ChevronRight size={12} className={`shrink-0 mt-0.5 transition-opacity ${active ? "text-[#C9A227] opacity-100" : "opacity-0"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 오른쪽: 결과 */}
          <div>
            {!selectedClause ? (
              <div className="border border-border bg-card h-full flex items-center justify-center p-10">
                <p className="text-sm text-muted-foreground">조항을 선택하세요.</p>
              </div>
            ) : (
              <div>
                {/* 조항 헤더 */}
                <div className="border border-[#C9A227]/40 bg-[#FDF8EC] px-5 py-4 mb-4">
                  <p className="text-[10px] font-bold text-[#C9A227] tracking-wider uppercase mb-1">
                    {RULE_LABELS[selectedClause.ruleType] ?? selectedClause.ruleType}
                  </p>
                  <p className="text-sm font-bold text-foreground">"{selectedClause.displayText}"</p>
                </div>

                {/* 필터 */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex border border-border">
                    {Object.entries(MARKET_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedMarket(key)}
                        className={`px-3 py-1.5 text-xs font-bold transition-all ${
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
                        className={`px-3 py-1.5 text-xs font-bold transition-all ${
                          selectedHorizon === h
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {h}일 후
                      </button>
                    ))}
                  </div>
                  {hasData && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      총 <strong className="text-foreground">{result!.total_signals.toLocaleString()}</strong>건 감지
                    </span>
                  )}
                </div>

                {/* 결과 없음 */}
                {!hasData ? (
                  <div className="border border-border bg-card px-5 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      {selectedMarket === "crypto" && selectedClause.ruleType === "PREMARKET_GAP"
                        ? "코인은 24시간 거래라 갭업 데이터가 없습니다."
                        : "해당 시장에서 감지된 패턴이 없습니다."}
                    </p>
                  </div>
                ) : isNoStopLoss && result?.mdd ? (
                  /* NO_STOP_LOSS — MDD */
                  <div className="border border-border bg-card p-5">
                    <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mb-4">
                      급등 진입 후 20일 내 최대 낙폭 분포
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: "평균 MDD", value: `${result.mdd.mean}%` },
                        { label: "중간값 MDD", value: `${result.mdd.median}%` },
                        { label: "-5% 이상 낙폭 비율", value: `${result.mdd.pct_over_5}%` },
                        { label: "-10% 이상 낙폭 비율", value: `${result.mdd.pct_over_10}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="border border-border p-4">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
                          <p className="text-2xl font-black text-[#B83535]">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      손절가 없이 급등 종목 진입 시 {result.mdd.pct_over_5}%의 경우 -5% 이상 낙폭을 경험합니다.
                    </p>
                  </div>
                ) : stats ? (
                  /* 일반 룰 — 수익률 */
                  <div className="border border-border bg-card p-5">
                    <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mb-4">
                      이 패턴 위반 다음날 진입 → {selectedHorizon}일 후 수익률
                    </p>
                    <div className="grid grid-cols-5 gap-3 mb-5">
                      {[
                        { label: "평균 수익률", value: `${stats.mean > 0 ? "+" : ""}${stats.mean}%`, big: true },
                        { label: "중간값", value: `${stats.median > 0 ? "+" : ""}${stats.median}%`, big: false },
                        { label: "승률", value: `${stats.win_rate}%`, big: false },
                        { label: "하위 5%", value: `${stats.worst}%`, big: false },
                        { label: "상위 5%", value: `+${stats.best}%`, big: false },
                      ].map(({ label, value, big }) => (
                        <div key={label} className="border border-border p-3">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
                          <p className={`font-black ${big ? "text-2xl" : "text-base"} ${
                            big ? (stats.mean > 0 ? "text-[#3D9E72]" : "text-[#B83535]") : "text-foreground"
                          }`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown size={11} className="text-[#B83535] shrink-0" />
                      <div className="flex-1 h-1.5 bg-muted overflow-hidden">
                        <div
                          className="h-full bg-[#3D9E72]"
                          style={{ width: `${stats.win_rate}%` }}
                        />
                      </div>
                      <TrendingUp size={11} className="text-[#3D9E72] shrink-0" />
                      <span className="text-[10px] text-muted-foreground w-14 text-right">
                        승률 {stats.win_rate}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{stats.n.toLocaleString()}개 샘플 기준</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
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
