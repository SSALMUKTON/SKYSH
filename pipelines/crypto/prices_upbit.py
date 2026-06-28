"""코인 일봉(OHLCV) — Upbit candles/days.

출력: data/crypto/prices/{MARKET}.parquet  (US prices 와 동일 스키마)
  - 인덱스: Date(datetime64[ms], KST 일자), 컬럼: Close, High, Low, Open, Volume

Upbit candles 는 1회 최대 200개라 'to' 파라미터로 과거로 페이지네이션.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

import pandas as pd

from ..common import config, io
from ..common.http import Http, retry_call
from . import markets_upbit

CANDLES_DAYS = "https://api.upbit.com/v1/candles/days"
COLUMNS = ["Close", "High", "Low", "Open", "Volume"]


def fetch_one(http: Http, market: str, start: str, end: str | None = None) -> pd.DataFrame | None:
    start_d = io.as_date(start)
    cursor = (io.as_date(end) if end else date.today()) + timedelta(days=1)
    recs: list[dict] = []
    while True:
        params = {
            "market": market,
            "count": 200,
            "to": cursor.strftime("%Y-%m-%dT00:00:00Z"),
        }
        batch = http.get_json(CANDLES_DAYS, params=params)
        if not batch:
            break
        for c in batch:
            d = datetime.strptime(c["candle_date_time_kst"][:10], "%Y-%m-%d")
            recs.append(
                {
                    "Date": d,
                    "Close": float(c["trade_price"]),
                    "High": float(c["high_price"]),
                    "Low": float(c["low_price"]),
                    "Open": float(c["opening_price"]),
                    "Volume": float(c["candle_acc_trade_volume"]),
                }
            )
        oldest = datetime.strptime(batch[-1]["candle_date_time_kst"][:10], "%Y-%m-%d").date()
        if oldest <= start_d or len(batch) < 200:
            break
        cursor = oldest  # 다음 페이지: 가장 오래된 캔들 이전
    if not recs:
        return None
    df = pd.DataFrame(recs).drop_duplicates("Date").set_index("Date").sort_index()
    df = df[df.index >= pd.Timestamp(start_d)]
    df = df[COLUMNS]
    df.index = df.index.astype("datetime64[ms]")
    df.index.name = "Date"
    df.columns.name = "Price"
    return df


def run(markets: list[str] | None = None, quote: str = "KRW",
        start: str | None = None, end: str | None = None, overwrite: bool = False) -> None:
    http = Http(user_agent="SKYSH/1.0", rate_per_sec=config.UPBIT_RATE)
    if markets is None:
        uni = io.load_json(config.CRYPTO / "universe" / "markets.json")
        if uni:
            markets = [m["market"] for m in uni if m["market"].startswith(f"{quote}-")]
        else:
            markets = markets_upbit.run(quote)
    start = start or config.PRICES_START
    out_dir = io.ensure_dir(config.CRYPTO / "prices")
    print(f"[crypto.prices] {len(markets)}개 마켓 수집 (증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for m in io.progress(markets, desc="crypto.prices"):
        path = out_dir / f"{m}.parquet"
        eff_start, skip = io.fetch_start(path, start, end, overwrite)  # 코인은 24/7 → 주말보정 X
        if skip:
            skipped += 1
            continue
        try:
            df = retry_call(fetch_one, http, m, eff_start, end)
            if df is None:
                continue
            io.merge_timeseries(path, df)
            ok += 1
        except Exception as e:
            failed.append(m)
            print(f"  ! {m}: {type(e).__name__}: {e}")
    io.report_failures(failed, "crypto.prices")
    print(f"[crypto.prices] 완료: {ok}/{len(markets)} (건너뜀 {skipped}, 실패 {len(failed)})")
