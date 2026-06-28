"""국내 주식 일봉(OHLCV) — 한국투자증권 KIS Developers REST API.

출력: data/kr/prices/{CODE}.parquet  (US prices 와 동일 스키마)
  - 인덱스: Date(datetime64[ms]), 컬럼: Close, High, Low, Open, Volume (수정주가)

KIS 일봉 조회는 1회 최대 약 100영업일이라 날짜 윈도우를 뒤로 이동하며 반복.
토큰은 디스크에 캐시(KIS 는 토큰 발급을 분당 1회로 제한).
"""
from __future__ import annotations

import json
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd

from ..common import config, io
from ..common.http import Http, retry_call
from . import universe_kr

BASE = {
    "prod": "https://openapi.koreainvestment.com:9443",
    "paper": "https://openapivts.koreainvestment.com:29443",
}
DAILY_CHART_PATH = "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
DAILY_CHART_TRID = "FHKST03010100"
COLUMNS = ["Close", "High", "Low", "Open", "Volume"]

_TOKEN_CACHE = Path(config.env("SKYSH_DATA_DIR") or config.ROOT) / ".kis_token.json"


class KISClient:
    def __init__(self):
        self.app_key = config.require(config.KIS_APP_KEY, "KIS_APP_KEY")
        self.app_secret = config.require(config.KIS_APP_SECRET, "KIS_APP_SECRET")
        self.base = BASE[config.KIS_ENV]
        self.http = Http(user_agent="SKYSH/1.0", rate_per_sec=4)
        self._token: str | None = None
        self._token_exp: float = 0.0
        self._load_token()

    # ── 토큰 ──
    def _load_token(self) -> None:
        try:
            data = json.loads(_TOKEN_CACHE.read_text(encoding="utf-8"))
            if data.get("env") == config.KIS_ENV and data.get("exp", 0) > time.time() + 60:
                self._token, self._token_exp = data["token"], data["exp"]
        except Exception:
            pass

    def _issue_token(self) -> None:
        r = self.http.post_json(
            f"{self.base}/oauth2/tokenP",
            json={
                "grant_type": "client_credentials",
                "appkey": self.app_key,
                "appsecret": self.app_secret,
            },
        )
        self._token = r["access_token"]
        # expires_in(초) 또는 access_token_token_expired 제공 — 보수적으로 23시간
        self._token_exp = time.time() + int(r.get("expires_in", 23 * 3600))
        try:
            _TOKEN_CACHE.write_text(
                json.dumps({"env": config.KIS_ENV, "token": self._token, "exp": self._token_exp}),
                encoding="utf-8",
            )
        except Exception:
            pass

    def token(self) -> str:
        if not self._token or self._token_exp <= time.time() + 60:
            self._issue_token()
        return self._token

    def _headers(self, tr_id: str) -> dict:
        return {
            "authorization": f"Bearer {self.token()}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": tr_id,
            "custtype": "P",
            "content-type": "application/json; charset=utf-8",
        }

    # ── 일봉 ──
    def daily_chart(self, code: str, start: date, end: date, adjusted: bool = True) -> list[dict]:
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",       # 주식
            "FID_INPUT_ISCD": code,
            "FID_INPUT_DATE_1": start.strftime("%Y%m%d"),
            "FID_INPUT_DATE_2": end.strftime("%Y%m%d"),
            "FID_PERIOD_DIV_CODE": "D",          # 일봉
            "FID_ORG_ADJ_PRC": "0" if adjusted else "1",  # 0:수정주가 1:원주가
        }
        data = self.http.get_json(
            f"{self.base}{DAILY_CHART_PATH}",
            headers=self._headers(DAILY_CHART_TRID),
            params=params,
        )
        if data.get("rt_cd") not in ("0", None):
            raise RuntimeError(f"KIS {code}: {data.get('msg1')}")
        return data.get("output2", []) or []


def _to_frame(rows: list[dict]) -> pd.DataFrame | None:
    recs = []
    for r in rows:
        d = r.get("stck_bsop_date")
        if not d or not r.get("stck_clpr"):
            continue
        recs.append(
            {
                "Date": datetime.strptime(d, "%Y%m%d"),
                "Close": float(r["stck_clpr"]),
                "High": float(r["stck_hgpr"]),
                "Low": float(r["stck_lwpr"]),
                "Open": float(r["stck_oprc"]),
                "Volume": int(float(r.get("acml_vol", 0) or 0)),
            }
        )
    if not recs:
        return None
    df = pd.DataFrame(recs).set_index("Date").sort_index()
    df = df[COLUMNS]
    df.index = df.index.astype("datetime64[ms]")
    df.index.name = "Date"
    df.columns.name = "Price"
    return df


def fetch_one(client: KISClient, code: str, start: str, end: str | None = None) -> pd.DataFrame | None:
    start_d = io.as_date(start)
    end_d = io.as_date(end) if end else date.today()
    frames = []
    win_end = end_d
    while win_end >= start_d:
        win_start = max(start_d, win_end - timedelta(days=140))  # 약 100영업일
        rows = client.daily_chart(code, win_start, win_end)
        df = _to_frame(rows)
        if df is not None:
            frames.append(df)
        win_end = win_start - timedelta(days=1)
        if df is None or len(df) == 0:
            break
    if not frames:
        return None
    out = pd.concat(frames)
    out = out[~out.index.duplicated(keep="last")].sort_index()
    return out


def run(codes: list[str] | None = None, index: str = "kospi200", start: str | None = None,
        end: str | None = None, overwrite: bool = False) -> None:
    if codes is None:
        uni = io.load_json(config.KR / "universe" / f"{index}.json")
        if not uni:
            uni = universe_kr.get_index_constituents(index)
        codes = [c["code"] for c in uni]
    start = start or config.PRICES_START
    out_dir = io.ensure_dir(config.KR / "prices")
    client = KISClient()
    print(f"[kr.prices] {len(codes)}종목 수집 (KIS {config.KIS_ENV}, 증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for code in io.progress(codes, desc="kr.prices"):
        path = out_dir / f"{code}.parquet"
        eff_start, skip = io.fetch_start(path, start, end, overwrite, weekend_aware=True)
        if skip:
            skipped += 1
            continue
        try:
            df = retry_call(fetch_one, client, code, eff_start, end)
            if df is None:
                continue
            io.merge_timeseries(path, df)
            ok += 1
        except Exception as e:
            failed.append(code)
            print(f"  ! {code}: {type(e).__name__}: {e}")
    io.report_failures(failed, "kr.prices")
    print(f"[kr.prices] 완료: {ok}/{len(codes)} (건너뜀 {skipped}, 실패 {len(failed)})")
