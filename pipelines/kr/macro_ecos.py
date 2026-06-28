"""국내 매크로 — 한국은행 ECOS API (US FRED 대응).

출력: data/kr/macro/ecos/{ALIAS}.parquet
  - 인덱스: 날짜(datetime), 컬럼: alias 1개

ECOS 통계/항목 코드는 통계마다 다르므로 SERIES 에 (stat_code, item_code, cycle) 로
명시한다. 아래는 대표 지표의 기본값이며, 정확한 코드는 ECOS 사이트에서 확인 후
필요에 맞게 수정하면 된다. (https://ecos.bok.or.kr/api/)
"""
from __future__ import annotations

from datetime import date

import pandas as pd

from ..common import config, io
from ..common.http import Http, retry_call

ECOS_URL = "https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/1/{n}/{stat}/{cycle}/{start}/{end}/{item}"

# alias -> (stat_code, item_code, cycle)   cycle: D(일) M(월) Q(분기) A(연)
# 미국 FRED 와 같은 역할(국채금리·기준금리·물가 등)을 한국은행 ECOS 로 수집한다.
# 우측 주석은 대응하는 FRED 시리즈. 정확한 통계표/항목 코드는 ECOS 키로 실측 검증 필요.
SERIES = {
    "base_rate":     ("722Y001", "0101000",   "M"),  # FEDFUNDS  한국은행 기준금리
    "ktb_3y":        ("817Y002", "010200000", "D"),  # DGS2(단기) 국고채 3년
    "ktb_10y":       ("817Y002", "010210000", "D"),  # DGS10     국고채 10년
    "cd_91d":        ("817Y002", "010502000", "D"),  #           CD(91일) 금리
    "usdkrw":        ("731Y003", "0000003",   "D"),  #           원/달러 환율
    "cpi":           ("901Y009", "0",         "M"),  # CPIAUCSL  소비자물가지수
    # 아래는 FRED 완전 대응을 위해 추가 후보 — ECOS 코드 확인 후 주석 해제
    # "unemployment": ("901Y027", "...", "M"),       # UNRATE    실업률
    # "ccsi":         ("511Y002", "...", "M"),       # UMCSENT   소비자심리지수(CCSI)
}


def _cycle_fmt(cycle: str, d: date) -> str:
    if cycle == "D":
        return d.strftime("%Y%m%d")
    if cycle == "M":
        return d.strftime("%Y%m")
    if cycle == "Q":
        return f"{d.year}Q{(d.month - 1) // 3 + 1}"
    return str(d.year)


def fetch_series(http: Http, alias: str, stat: str, item: str, cycle: str,
                 start: date, end: date) -> pd.DataFrame:
    key = config.require(config.ECOS_API_KEY, "ECOS_API_KEY")
    url = ECOS_URL.format(
        key=key, n=10000, stat=stat, cycle=cycle,
        start=_cycle_fmt(cycle, start), end=_cycle_fmt(cycle, end), item=item,
    )
    data = http.get_json(url)
    rows = data.get("StatisticSearch", {}).get("row", [])
    recs = []
    for r in rows:
        t = r.get("TIME")
        v = r.get("DATA_VALUE")
        if not t or v in (None, ""):
            continue
        recs.append((t, float(v)))
    if not recs:
        return pd.DataFrame()
    df = pd.DataFrame(recs, columns=["time", alias])
    df["time"] = pd.to_datetime(df["time"], format=_strptime_fmt(cycle), errors="coerce")
    df = df.dropna(subset=["time"]).set_index("time").sort_index()
    df.index.name = None
    return df


def _strptime_fmt(cycle: str) -> str:
    return {"D": "%Y%m%d", "M": "%Y%m", "A": "%Y"}.get(cycle, "%Y%m%d")


def run(series: dict | None = None, start: str | None = None, end: str | None = None,
        overwrite: bool = False) -> None:
    series = series or SERIES
    req_start = start or config.MACRO_START
    end_d = io.as_date(end or date.today().isoformat())
    out_dir = io.ensure_dir(config.KR / "macro" / "ecos")
    http = Http(user_agent="SKYSH/1.0", rate_per_sec=4)
    print(f"[kr.ecos] {len(series)}개 시리즈 수집 (증분={'off' if overwrite else 'on'})")
    skipped = 0
    failed: list[str] = []
    for alias, (stat, item, cycle) in series.items():
        path = out_dir / f"{alias}.parquet"
        eff_start, skip = io.fetch_start(path, req_start, end, overwrite, weekend_aware=True)
        if skip:
            skipped += 1
            continue
        start_d = io.as_date(eff_start)
        try:
            df = retry_call(fetch_series, http, alias, stat, item, cycle, start_d, end_d)
            if not df.empty:
                io.merge_timeseries(path, df)
            else:
                print(f"  - {alias}: 데이터 없음(코드 확인 필요)")
        except Exception as e:
            failed.append(alias)
            print(f"  ! {alias}: {type(e).__name__}: {e}")
    io.report_failures(failed, "kr.ecos")
    print(f"[kr.ecos] 완료 (건너뜀 {skipped}, 실패 {len(failed)})")
