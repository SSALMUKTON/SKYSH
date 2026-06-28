"""국내 공시 목록 — DART 공시검색 API (US sec/filings 대응).

출력: data/kr/disclosures/{CODE}.json
  [{report_nm, rcept_no, rcept_dt, flr_nm, corp_name, corp_code, stock_code, rm, url}]
"""
from __future__ import annotations

from datetime import date

from ..common import config, io
from ..common.http import Http, retry_call
from . import universe_kr

LIST_URL = "https://opendart.fss.or.kr/api/list.json"
VIEW_URL = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"


def fetch_disclosures(http: Http, corp_code: str, bgn_de: str, end_de: str) -> list[dict]:
    key = config.require(config.DART_API_KEY, "DART_API_KEY")
    out: list[dict] = []
    page = 1
    while True:
        data = http.get_json(
            LIST_URL,
            params={
                "crtfc_key": key,
                "corp_code": corp_code,
                "bgn_de": bgn_de,
                "end_de": end_de,
                "page_no": page,
                "page_count": 100,
            },
        )
        status = data.get("status")
        if status == "013":  # 조회된 데이터 없음
            break
        if status != "000":
            raise RuntimeError(f"DART list {corp_code}: {status} {data.get('message')}")
        for it in data.get("list", []):
            out.append(
                {
                    "report_nm": it.get("report_nm", ""),
                    "rcept_no": it.get("rcept_no", ""),
                    "rcept_dt": it.get("rcept_dt", ""),
                    "flr_nm": it.get("flr_nm", ""),
                    "corp_name": it.get("corp_name", ""),
                    "corp_code": it.get("corp_code", ""),
                    "stock_code": it.get("stock_code", ""),
                    "rm": it.get("rm", ""),
                    "url": VIEW_URL.format(rcept_no=it.get("rcept_no", "")),
                }
            )
        if page >= int(data.get("total_page", 1)):
            break
        page += 1
    return out


def run(codes: list[str] | None = None, index: str = "kospi200",
        bgn_de: str | None = None, end_de: str | None = None, overwrite: bool = False) -> None:
    corpcodes = universe_kr.load_corpcodes()
    if not corpcodes:
        corpcodes = universe_kr.fetch_dart_corpcodes()
        io.save_json(config.KR / "universe" / "dart_corpcodes.json", corpcodes)
    if codes is None:
        uni = io.load_json(config.KR / "universe" / f"{index}.json") or []
        codes = [c["code"] for c in uni] or list(corpcodes)
    bgn_de = (bgn_de or config.NEWS_START).replace("-", "")
    end_de = (end_de or date.today().isoformat()).replace("-", "")
    out_dir = io.ensure_dir(config.KR / "disclosures")
    http = Http(user_agent="SKYSH/1.0", rate_per_sec=4)
    print(f"[kr.disclosures] {len(codes)}종목 {bgn_de}~{end_de} (증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for code in io.progress(codes, desc="kr.disclosures"):
        info = corpcodes.get(code)
        if not info:
            continue
        if not overwrite and (out_dir / f"{code}.json").exists():
            skipped += 1
            continue
        try:
            items = retry_call(fetch_disclosures, http, info["corp_code"], bgn_de, end_de)
            io.save_json(out_dir / f"{code}.json", items)
            ok += 1
        except Exception as e:
            failed.append(code)
            print(f"  ! {code}: {type(e).__name__}: {e}")
    io.report_failures(failed, "kr.disclosures")
    print(f"[kr.disclosures] 완료: {ok}/{len(codes)} (건너뜀 {skipped}, 실패 {len(failed)})")
