"""미국 주식 가격(OHLCV) — yfinance.

출력: data/us/prices/{TICKER}.parquet
  - 인덱스: Date (datetime64[ms])
  - 컬럼: Close, High, Low, Open, Volume  (수정주가, auto_adjust=True)
기존 data/us/prices/*.parquet 와 동일한 스키마.
"""
from __future__ import annotations

import pandas as pd

from ..common import config, io
from ..common.http import retry_call
from ..common.universe import get_sp500

COLUMNS = ["Close", "High", "Low", "Open", "Volume"]


def fetch_one(ticker: str, start: str | None = None, end: str | None = None) -> pd.DataFrame | None:
    import yfinance as yf

    df = yf.download(
        ticker,
        start=start or config.PRICES_START,
        end=end,
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=False,
        actions=False,
    )
    if df is None or df.empty:
        return None
    if isinstance(df.columns, pd.MultiIndex):  # 단일 티커도 멀티인덱스로 올 때가 있음
        df.columns = df.columns.get_level_values(0)
    df = df.reindex(columns=COLUMNS)
    df = df.dropna(how="all")
    if df.empty:
        return None
    df.index = pd.to_datetime(df.index).tz_localize(None).astype("datetime64[ms]")
    df.index.name = "Date"
    df.columns.name = "Price"
    df["Volume"] = df["Volume"].fillna(0).astype("int64")
    return df


def run(tickers: list[str] | None = None, start: str | None = None, end: str | None = None,
        overwrite: bool = False) -> None:
    tickers = tickers or get_sp500()
    out_dir = io.ensure_dir(config.US / "prices")
    print(f"[us.prices] {len(tickers)}개 종목 수집 시작 (증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for t in io.progress(tickers, desc="us.prices"):
        path = out_dir / f"{t}.parquet"
        eff_start, skip = io.fetch_start(path, start, end, overwrite, weekend_aware=True)
        if skip:  # 이미 최신 → 다운로드 안 함
            skipped += 1
            continue
        try:
            df = retry_call(fetch_one, t, eff_start, end)  # 종목 단위 재시도(rate limit 대비)
            if df is None:
                continue
            io.merge_timeseries(path, df)
            ok += 1
        except Exception as e:  # 재시도 후에도 실패 → 목록에 남기고 계속
            failed.append(t)
            print(f"  ! {t}: {type(e).__name__}: {e}")
    io.report_failures(failed, "us.prices")
    print(f"[us.prices] 완료: {ok}/{len(tickers)} (건너뜀 {skipped}, 실패 {len(failed)})")
