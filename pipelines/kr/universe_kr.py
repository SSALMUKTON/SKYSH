"""국내 유니버스 + DART corp_code 매핑.

- 상장 종목 목록: KRX KIND 상장법인목록(corpList.do) — 키 불필요, 안정적.
  (pykrx 의 종목목록/지수구성 엔드포인트는 KRX 가 빈 응답을 줄 때가 잦아 KIND 사용.
   지수구성(KOSPI200/KOSDAQ150)은 pykrx 가 되면 그걸 쓰고, 실패하면 해당 시장 전체로 폴백.)
- DART corp_code: opendart corpCode.xml(zip) 파싱 -> {stock_code: {corp_code, name}}

출력:
  data/kr/universe/{index}.json          [{code, name}]
  data/kr/universe/dart_corpcodes.json   {stock_code: {corp_code, corp_name}}
"""
from __future__ import annotations

import io as _io
import zipfile
from xml.etree import ElementTree as ET

import pandas as pd

from ..common import config, io
from ..common.http import Http

CORPCODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
KIND_URL = "http://kind.krx.co.kr/corpgeneral/corpList.do"
KIND_MARKET = {"KOSPI": "stockMkt", "KOSDAQ": "kosdaqMkt"}
# index -> (pykrx 지수코드, 폴백 시장)
INDEX_CODES = {"kospi200": ("1028", "KOSPI"), "kosdaq150": ("2001", "KOSDAQ")}

_BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"


def _norm_code(code) -> str:
    return str(code).strip().zfill(6)


def fetch_listed(market: str, http: Http | None = None) -> list[dict]:
    """KRX KIND 상장법인목록 -> [{code, name}] (market: KOSPI | KOSDAQ)."""
    http = http or Http(user_agent=_BROWSER_UA)
    txt = http.get(
        KIND_URL,
        params={"method": "download", "searchType": "13", "marketType": KIND_MARKET[market]},
    ).text
    df = pd.read_html(_io.StringIO(txt))[0]
    return [
        {"code": _norm_code(r["종목코드"]), "name": str(r["회사명"]).strip()}
        for _, r in df.iterrows()
    ]


def _pykrx_index(idx_code: str) -> list[str]:
    """pykrx 지수구성. KRX 빈응답/오류면 [] 반환(폴백 유도)."""
    try:
        from pykrx import stock

        tickers = stock.get_index_portfolio_deposit_file(idx_code)
        return list(tickers) if tickers else []
    except Exception:
        return []


def get_index_constituents(index: str = "kospi200") -> list[dict]:
    if index == "kospi":
        return fetch_listed("KOSPI")
    if index == "kosdaq":
        return fetch_listed("KOSDAQ")
    if index == "all":
        return fetch_listed("KOSPI") + fetch_listed("KOSDAQ")
    if index in INDEX_CODES:
        idx_code, fb_market = INDEX_CODES[index]
        listed = {c["code"]: c["name"] for c in fetch_listed(fb_market)}
        codes = _pykrx_index(idx_code)
        if codes:  # 지수구성 정상
            return [{"code": _norm_code(c), "name": listed.get(_norm_code(c), "")} for c in codes]
        print(f"[kr.universe] {index} 지수구성 조회 불가(KRX 빈응답) → {fb_market} 전체 상장 "
              f"{len(listed)}종목으로 대체")
        return [{"code": c, "name": n} for c, n in listed.items()]
    raise ValueError(f"알 수 없는 index: {index} (kospi200|kosdaq150|kospi|kosdaq|all)")


def fetch_dart_corpcodes(http: Http | None = None) -> dict[str, dict]:
    """DART 전체 회사 corp_code 매핑(상장사만, stock_code 보유)."""
    key = config.require(config.DART_API_KEY, "DART_API_KEY")
    http = http or Http(user_agent="SKYSH/1.0", rate_per_sec=2)
    raw = http.get(CORPCODE_URL, params={"crtfc_key": key}).content
    with zipfile.ZipFile(_io.BytesIO(raw)) as zf:
        xml = zf.read(zf.namelist()[0])
    root = ET.fromstring(xml)
    mapping: dict[str, dict] = {}
    for el in root.iter("list"):
        stock_code = (el.findtext("stock_code") or "").strip()
        if not stock_code:  # 비상장 제외
            continue
        mapping[stock_code] = {
            "corp_code": (el.findtext("corp_code") or "").strip(),
            "corp_name": (el.findtext("corp_name") or "").strip(),
        }
    return mapping


def run(index: str = "kospi200", with_dart: bool = True) -> dict:
    out_dir = io.ensure_dir(config.KR / "universe")
    constituents = get_index_constituents(index)
    io.save_json(out_dir / f"{index}.json", constituents)
    print(f"[kr.universe] {index}: {len(constituents)}종목 저장")
    result = {"index": index, "constituents": constituents}
    if with_dart and config.DART_API_KEY:
        corpcodes = fetch_dart_corpcodes()
        io.save_json(out_dir / "dart_corpcodes.json", corpcodes)
        print(f"[kr.universe] DART corp_code {len(corpcodes)}건 저장")
        result["corpcodes"] = corpcodes
    return result


def load_corpcodes() -> dict[str, dict]:
    return io.load_json(config.KR / "universe" / "dart_corpcodes.json", default={})
