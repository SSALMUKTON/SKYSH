"""유니버스(수집 대상 종목 목록) 해석.

- 미국: S&P 500 구성종목 (datasets/datahub CSV, 실패 시 Wikipedia 폴백)
- 국내/코인 유니버스는 각 자산군 모듈에서 처리(pykrx / Upbit)
"""
from __future__ import annotations

import io as _io

import pandas as pd

from .http import Http

# 깃허브에서 유지보수되는 S&P 500 구성종목 CSV (Symbol,Security,GICS Sector,...)
SP500_CSV = (
    "https://raw.githubusercontent.com/datasets/"
    "s-and-p-500-companies/main/data/constituents.csv"
)
WIKI_SP500 = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"


def _normalize(symbol: str) -> str:
    # yfinance/SEC 는 클래스주에 '-' 사용 (예: BRK.B -> BRK-B)
    return symbol.strip().upper().replace(".", "-")


def get_sp500(http: Http | None = None) -> list[str]:
    http = http or Http(user_agent="SKYSH/1.0")
    try:
        text = http.get(SP500_CSV).text
        df = pd.read_csv(_io.StringIO(text))
        col = "Symbol" if "Symbol" in df.columns else df.columns[0]
        syms = [_normalize(s) for s in df[col].dropna().tolist()]
    except Exception:
        # 폴백: 위키피디아 테이블
        tables = pd.read_html(WIKI_SP500)
        df = tables[0]
        syms = [_normalize(s) for s in df["Symbol"].dropna().tolist()]
    # 중복 제거(순서 유지)
    seen: set[str] = set()
    out: list[str] = []
    for s in syms:
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out
