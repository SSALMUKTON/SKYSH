"""국내 주식 일봉(OHLCV) — KRX(pykrx). 계좌·API키 불필요.

출력: data/kr/prices/{CODE}.parquet  (US/코인 prices 와 동일 스키마)
  - 인덱스: Date(datetime64[ms]), 컬럼: Close, High, Low, Open, Volume (수정주가)

KIS 수집기와 출력 경로/스키마가 동일해 `--source pykrx|kis` 로 교체 가능.
과거 일봉만 제공(실시간/분·틱 없음) — 실시간이 필요하면 KIS(prices_kis) 사용.
"""
from __future__ import annotations

import time
from datetime import date

import pandas as pd

from ..common import config, io
from ..common.http import retry_call
from . import universe_kr

COLUMNS = ["Close", "High", "Low", "Open", "Volume"]
RENAME = {"시가": "Open", "고가": "High", "저가": "Low", "종가": "Close", "거래량": "Volume"}
REQUEST_DELAY = 0.2  # KRX 차단 방지용 종목 간 간격(초)


def fetch_one(code: str, start: str, end: str | None = None, adjusted: bool = True) -> pd.DataFrame | None:
    from pykrx import stock

    s = io.as_date(start).strftime("%Y%m%d")
    e = (io.as_date(end) if end else date.today()).strftime("%Y%m%d")
    df = stock.get_market_ohlcv(s, e, code, adjusted=adjusted)
    if df is None or df.empty:
        return None
    df = df.rename(columns=RENAME)
    if any(c not in df.columns for c in COLUMNS):
        return None
    df = df[COLUMNS].copy()
    df = df[df["Close"] > 0]  # 거래정지/데이터 없는 날(0가) 제거
    if df.empty:
        return None
    idx = pd.to_datetime(df.index)
    if getattr(idx, "tz", None) is not None:
        idx = idx.tz_localize(None)
    df.index = idx.astype("datetime64[ms]")
    df.index.name = "Date"
    df.columns.name = "Price"
    df["Volume"] = df["Volume"].fillna(0).astype("int64")
    return df.sort_index()


def run(codes: list[str] | None = None, index: str = "kospi200", start: str | None = None,
        end: str | None = None, overwrite: bool = False) -> None:
    if codes is None:
        uni = io.load_json(config.KR / "universe" / f"{index}.json")
        if not uni:
            uni = universe_kr.get_index_constituents(index)
        codes = [c["code"] for c in uni]
    start = start or config.PRICES_START
    out_dir = io.ensure_dir(config.KR / "prices")
    print(f"[kr.prices/pykrx] {len(codes)}종목 수집 (무계좌, 증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for code in io.progress(codes, desc="kr.prices"):
        path = out_dir / f"{code}.parquet"
        eff_start, skip = io.fetch_start(path, start, end, overwrite, weekend_aware=True)
        if skip:
            skipped += 1
            continue
        try:
            df = retry_call(fetch_one, code, eff_start, end)
            if df is not None:
                io.merge_timeseries(path, df)
                ok += 1
        except Exception as e:
            failed.append(code)
            print(f"  ! {code}: {type(e).__name__}: {e}")
        time.sleep(REQUEST_DELAY)
    io.report_failures(failed, "kr.prices")
    print(f"[kr.prices/pykrx] 완료: {ok}/{len(codes)} (건너뜀 {skipped}, 실패 {len(failed)})")
