"""
백테스트 엔진 — 유언장 조항별 위반 시점 감지 + 이후 수익률 분석

실행: python -m pipelines.backtest [--market us|kr|crypto|all] [--out data/backtest_results.json]
"""

import argparse
import json
import os
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
DATA = ROOT / "data"
HORIZONS = [20, 60, 120]  # 위반 후 N일 수익률 측정


# ── 헬퍼 ──────────────────────────────────────────────────────────────────────

def load_prices(market: str) -> dict[str, pd.DataFrame]:
    """market 폴더의 parquet 전부 로드. {symbol: df(OHLCV)}"""
    folder = DATA / market / "prices"
    if not folder.exists():
        return {}
    out = {}
    for f in folder.glob("*.parquet"):
        try:
            df = pd.read_parquet(f)
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            # 멀티레벨 컬럼 flatten
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            if "Close" not in df.columns:
                continue
            out[f.stem] = df
        except Exception:
            pass
    return out


def forward_return(series: pd.Series, idx: int, n: int) -> float | None:
    """idx 시점 매수 → n일 후 수익률(%)"""
    if idx + n >= len(series):
        return None
    entry = series.iloc[idx]
    if entry == 0:
        return None
    return (series.iloc[idx + n] - entry) / entry * 100


def analyze_violations(
    prices: dict[str, pd.DataFrame],
    detector: Callable[[pd.DataFrame], pd.Series],
    label: str,
) -> dict:
    """
    detector(df) → bool Series (True = 위반 시점)
    각 위반 다음날 매수 → HORIZONS일 수익률 수집
    """
    returns: dict[int, list[float]] = {h: [] for h in HORIZONS}
    violation_dates: list[str] = []
    total_signals = 0

    for symbol, df in prices.items():
        if len(df) < max(HORIZONS) + 2:
            continue
        try:
            signal = detector(df)
        except Exception:
            continue

        signal = signal.reindex(df.index).fillna(False)
        idxs = np.where(signal.values)[0]

        for i in idxs:
            buy_i = i + 1  # 위반 다음날 매수
            if buy_i >= len(df):
                continue
            total_signals += 1
            violation_dates.append(str(df.index[i].date()))
            for h in HORIZONS:
                r = forward_return(df["Close"], buy_i, h)
                if r is not None:
                    returns[h].append(r)

    def stats(vals: list[float]) -> dict:
        if not vals:
            return {"mean": 0, "median": 0, "win_rate": 0, "worst": 0, "best": 0, "n": 0}
        a = np.array(vals)
        return {
            "mean": round(float(np.mean(a)), 2),
            "median": round(float(np.median(a)), 2),
            "win_rate": round(float((a > 0).mean() * 100), 1),
            "worst": round(float(np.percentile(a, 5)), 2),
            "best": round(float(np.percentile(a, 95)), 2),
            "n": len(vals),
        }

    return {
        "rule": label,
        "total_signals": total_signals,
        "returns": {str(h): stats(returns[h]) for h in HORIZONS},
        "recent_dates": sorted(set(violation_dates))[-10:],
    }


# ── 룰별 detector ─────────────────────────────────────────────────────────────

def detect_chase_surge(df: pd.DataFrame, pct: float = 10.0) -> pd.Series:
    """전일 대비 +pct% 이상 급등한 날"""
    change = df["Close"].pct_change() * 100
    return change >= pct


def detect_premarket_gap(df: pd.DataFrame, pct: float = 3.0) -> pd.Series:
    """시가가 전일 종가 대비 +pct% 이상 갭업된 날"""
    if "Open" not in df.columns:
        return pd.Series(False, index=df.index)
    gap = (df["Open"] - df["Close"].shift(1)) / df["Close"].shift(1) * 100
    return gap >= pct


def detect_revenge_trade(df: pd.DataFrame) -> pd.Series:
    """전일 하락(-3% 이상) 후 당일 시가가 또 하락 출발한 날 (보복매매 패턴)"""
    prev_loss = df["Close"].pct_change() * 100 <= -3
    if "Open" not in df.columns:
        return pd.Series(False, index=df.index)
    gap_down = (df["Open"] - df["Close"].shift(1)) / df["Close"].shift(1) * 100 <= -1
    return prev_loss.shift(1).fillna(False) & gap_down


def detect_market_order_impulse(df: pd.DataFrame) -> pd.Series:
    """거래량이 20일 평균의 2.5배 이상인 날 (충동 시장가 패턴)"""
    if "Volume" not in df.columns:
        return pd.Series(False, index=df.index)
    vol_ma = df["Volume"].rolling(20).mean()
    return (df["Volume"] >= vol_ma * 2.5) & (df["Close"].pct_change() * 100 >= 5)


def detect_averaging_down(df: pd.DataFrame) -> pd.Series:
    """3일 연속 하락 (물타기 유혹 구간)"""
    down = df["Close"].pct_change() < 0
    return down & down.shift(1).fillna(False) & down.shift(2).fillna(False)


def detect_no_stop_loss(df: pd.DataFrame) -> pd.Series:
    """급등 후 손절 없이 진입하면 얼마나 물리나 — CHASE_SURGE와 동일 진입점에서 MDD 측정"""
    change = df["Close"].pct_change() * 100
    return change >= 8


# ── MDD 분석 (NO_STOP_LOSS 전용) ──────────────────────────────────────────────

def analyze_no_stop_loss(prices: dict[str, pd.DataFrame]) -> dict:
    """급등 진입 후 최대 낙폭(MDD) 분석"""
    mdds: list[float] = []
    total_signals = 0

    for symbol, df in prices.items():
        if len(df) < 25:
            continue
        try:
            signal = detect_no_stop_loss(df)
        except Exception:
            continue

        idxs = np.where(signal.values)[0]
        for i in idxs:
            buy_i = i + 1
            if buy_i + 20 >= len(df):
                continue
            total_signals += 1
            window = df["Close"].iloc[buy_i: buy_i + 20]
            entry = window.iloc[0]
            if entry == 0:
                continue
            mdd = float((window.min() - entry) / entry * 100)
            mdds.append(mdd)

    if not mdds:
        return {"rule": "NO_STOP_LOSS", "total_signals": 0, "mdd": {}}

    a = np.array(mdds)
    return {
        "rule": "NO_STOP_LOSS",
        "total_signals": total_signals,
        "mdd": {
            "mean": round(float(np.mean(a)), 2),
            "median": round(float(np.median(a)), 2),
            "worst": round(float(np.percentile(a, 5)), 2),
            "pct_over_5": round(float((a <= -5).mean() * 100), 1),
            "pct_over_10": round(float((a <= -10).mean() * 100), 1),
            "n": len(a),
        },
        "returns": {
            str(h): {"mean": 0, "median": 0, "win_rate": 0, "worst": 0, "best": 0, "n": 0}
            for h in HORIZONS
        },
    }


# ── 메인 ──────────────────────────────────────────────────────────────────────

RULES = [
    ("CHASE_SURGE", detect_chase_surge),
    ("PREMARKET_GAP", detect_premarket_gap),
    ("REVENGE_TRADE", detect_revenge_trade),
    ("MARKET_ORDER_IMPULSE", detect_market_order_impulse),
    ("AVERAGING_DOWN", detect_averaging_down),
]

MARKETS = ["us", "kr", "crypto"]


def run(markets: list[str], out_path: Path) -> None:
    results = []

    for market in markets:
        print(f"\n[{market.upper()}] 가격 데이터 로드 중...")
        prices = load_prices(market)
        print(f"  → {len(prices)}개 종목")
        if not prices:
            continue

        for rule_type, detector in RULES:
            print(f"  [{rule_type}] 분석 중...", end=" ", flush=True)
            res = analyze_violations(prices, detector, rule_type)
            res["market"] = market
            results.append(res)
            print(f"{res['total_signals']}건")

        # NO_STOP_LOSS는 MDD 분석
        print(f"  [NO_STOP_LOSS] MDD 분석 중...", end=" ", flush=True)
        res = analyze_no_stop_loss(prices)
        res["market"] = market
        results.append(res)
        print(f"{res['total_signals']}건")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"results": results, "horizons": HORIZONS}, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 저장 완료: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--market", default="all", choices=["us", "kr", "crypto", "all"])
    parser.add_argument("--out", default="data/backtest_results.json")
    args = parser.parse_args()

    markets = MARKETS if args.market == "all" else [args.market]
    run(markets, Path(args.out))
