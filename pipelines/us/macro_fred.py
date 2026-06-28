"""미국 매크로 지표 — FRED(St. Louis Fed) API.

출력: data/us/macro/fred/{SERIES}.parquet
  - 인덱스: 날짜(datetime), 컬럼: 시리즈 코드 1개
기존 8개 시리즈와 동일 형식.
"""
from __future__ import annotations

import pandas as pd

from ..common import config, io
from ..common.http import Http, retry_call

FRED_OBS = "https://api.stlouisfed.org/fred/series/observations"

# 기존 data/us/macro/fred 에 있던 시리즈
DEFAULT_SERIES = [
    "CPIAUCSL",  # 소비자물가지수
    "DGS10",     # 미 국채 10년물 금리
    "DGS2",      # 미 국채 2년물 금리
    "FEDFUNDS",  # 연방기금금리
    "T10Y2Y",    # 10년-2년 스프레드
    "UMCSENT",   # 미시간대 소비자심리
    "UNRATE",    # 실업률
    "VIXCLS",    # VIX 변동성지수
]


def fetch_series(http: Http, series_id: str, start: str) -> pd.DataFrame:
    data = http.get_json(
        FRED_OBS,
        params={
            "series_id": series_id,
            "api_key": config.require(config.FRED_API_KEY, "FRED_API_KEY"),
            "file_type": "json",
            "observation_start": start,
        },
    )
    rows = [
        (o["date"], o["value"])
        for o in data.get("observations", [])
        if o.get("value") not in (".", "", None)
    ]
    df = pd.DataFrame(rows, columns=["date", series_id])
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date")
    df.index.name = None
    df[series_id] = pd.to_numeric(df[series_id], errors="coerce")
    return df.dropna()


def run(series: list[str] | None = None, start: str | None = None, overwrite: bool = False) -> None:
    series = series or DEFAULT_SERIES
    start = start or config.MACRO_START
    out_dir = io.ensure_dir(config.US / "macro" / "fred")
    http = Http(user_agent="SKYSH/1.0", rate_per_sec=8)
    print(f"[us.fred] {len(series)}개 시리즈 수집 (증분={'off' if overwrite else 'on'})")
    skipped = 0
    failed: list[str] = []
    for sid in io.progress(series, desc="us.fred"):
        path = out_dir / f"{sid}.parquet"
        eff_start, skip = io.fetch_start(path, start, None, overwrite, weekend_aware=True)
        if skip:
            skipped += 1
            continue
        try:
            df = retry_call(fetch_series, http, sid, eff_start)
            if not df.empty:
                io.merge_timeseries(path, df)
        except Exception as e:
            failed.append(sid)
            print(f"  ! {sid}: {type(e).__name__}: {e}")
    io.report_failures(failed, "us.fred")
    print(f"[us.fred] 완료 (건너뜀 {skipped}, 실패 {len(failed)})")
