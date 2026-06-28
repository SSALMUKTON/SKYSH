"""국내 밸류에이션 — KRX 정보데이터시스템(pykrx).

DART 에는 없는 정규화 지표(PER/PBR/배당수익률/시총)를 일별로 수집.
출력: data/kr/valuation/{CODE}.parquet
  - 인덱스: Date(datetime64[ms])
  - 컬럼: BPS, PER, PBR, EPS, DIV, DPS, marketcap, shares
"""
from __future__ import annotations

from datetime import date

import pandas as pd

from ..common import config, io
from ..common.http import retry_call


def fetch_one(code: str, start: str, end: str) -> pd.DataFrame | None:
    from pykrx import stock

    s = start.replace("-", "")
    e = end.replace("-", "")
    fund = stock.get_market_fundamental(s, e, code)        # BPS,PER,PBR,EPS,DIV,DPS
    cap = stock.get_market_cap(s, e, code)                  # 시가총액,거래량,...,상장주식수
    if (fund is None or fund.empty) and (cap is None or cap.empty):
        return None
    df = fund.copy() if fund is not None else pd.DataFrame()
    if cap is not None and not cap.empty:
        df["marketcap"] = cap.get("시가총액")
        df["shares"] = cap.get("상장주식수")
    df.index = pd.to_datetime(df.index).astype("datetime64[ms]")
    df.index.name = "Date"
    return df.sort_index()


def run(codes: list[str] | None = None, index: str = "kospi200",
        start: str | None = None, end: str | None = None, overwrite: bool = False) -> None:
    if codes is None:
        uni = io.load_json(config.KR / "universe" / f"{index}.json") or []
        codes = [c["code"] for c in uni]
    start = start or config.PRICES_START
    end = end or date.today().isoformat()
    out_dir = io.ensure_dir(config.KR / "valuation")
    print(f"[kr.valuation] {len(codes)}종목 {start}~{end} (증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for code in io.progress(codes, desc="kr.valuation"):
        path = out_dir / f"{code}.parquet"
        eff_start, skip = io.fetch_start(path, start, end, overwrite, weekend_aware=True)
        if skip:
            skipped += 1
            continue
        try:
            df = retry_call(fetch_one, code, eff_start, end)
            if df is None or df.empty:
                continue
            io.merge_timeseries(path, df)
            ok += 1
        except Exception as e:
            failed.append(code)
            print(f"  ! {code}: {type(e).__name__}: {e}")
    io.report_failures(failed, "kr.valuation")
    print(f"[kr.valuation] 완료: {ok}/{len(codes)} (건너뜀 {skipped}, 실패 {len(failed)})")
