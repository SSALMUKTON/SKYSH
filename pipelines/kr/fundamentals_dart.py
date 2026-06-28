"""국내 정형 재무 — DART 단일회사 전체 재무제표(fnlttSinglAcntAll).

출력: data/kr/fundamentals/{CODE}.json  (US sec/fundamentals 와 동일 스키마)
  {ticker, asof, currency, quarters:[{period_end, revenue, ..., margins, yoy}]}

DART 분기 보고서는 누적값(반기=6M, 3분기=9M)이므로 차분해 단일 분기로 환산한다.
(12월 결산 가정 — 일부 비12월 결산사는 period_end 가 어긋날 수 있음)
"""
from __future__ import annotations

from datetime import date

from ..common import config, io
from ..common.http import Http, retry_call
from . import universe_kr

FS_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json"

# reprt_code -> (분기번호, period_end suffix)
REPORTS = [
    ("11013", 1, "-03-31"),  # 1분기
    ("11012", 2, "-06-30"),  # 반기(2분기 누적)
    ("11014", 3, "-09-30"),  # 3분기(3분기 누적)
    ("11011", 4, "-12-31"),  # 사업보고서(연간)
]

# account_id 키워드(접두사 무시) -> 표준 필드
ACCOUNT_IDS = {
    "revenue": ["revenue"],
    "gross_profit": ["grossprofit"],
    "operating_income": ["operatingincomeloss"],
    "net_income": ["profitloss"],
    "operating_cash_flow": ["cashflowsfromusedinoperatingactivities"],
    "total_assets": ["assets"],
    "total_liabilities": ["liabilities"],
    "total_equity": ["equity"],
    "cash": ["cashandcashequivalents"],
    "eps_diluted": ["dilutedearningslosspershare"],
}
# account_nm 폴백(account_id 가 비표준일 때)
ACCOUNT_NAMES = {
    "revenue": ["매출액", "수익(매출액)", "영업수익"],
    "gross_profit": ["매출총이익"],
    "operating_income": ["영업이익"],
    "net_income": ["당기순이익"],
    "operating_cash_flow": ["영업활동현금흐름", "영업활동으로인한현금흐름"],
    "total_assets": ["자산총계"],
    "total_liabilities": ["부채총계"],
    "total_equity": ["자본총계"],
    "cash": ["현금및현금성자산"],
    "eps_diluted": ["희석주당이익", "희석주당순이익"],
}
FLOW_FIELDS = {"revenue", "gross_profit", "operating_income", "net_income", "operating_cash_flow"}
INSTANT_FIELDS = {"total_assets", "total_liabilities", "total_equity", "cash"}


def _num(s):
    if s in (None, "", "-"):
        return None
    try:
        return float(str(s).replace(",", "").replace(" ", ""))
    except ValueError:
        return None


def _norm_id(account_id: str) -> str:
    aid = (account_id or "").lower()
    for pre in ("ifrs-full_", "ifrs_", "dart_", "-standard"):
        aid = aid.replace(pre, "")
    return aid


def _match_field(account_id: str, account_nm: str) -> str | None:
    aid = _norm_id(account_id)
    for field, ids in ACCOUNT_IDS.items():
        if any(k == aid for k in ids):
            return field
    nm = (account_nm or "").replace(" ", "")
    for field, names in ACCOUNT_NAMES.items():
        if any(n in nm for n in names):
            return field
    return None


def fetch_report(http: Http, corp_code: str, year: int, reprt_code: str) -> dict[str, float]:
    """한 보고서의 {field: 당기금액(누적)}. 연결(CFS) 우선, 없으면 별도(OFS)."""
    key = config.require(config.DART_API_KEY, "DART_API_KEY")
    for fs_div in ("CFS", "OFS"):
        data = http.get_json(
            FS_URL,
            params={
                "crtfc_key": key,
                "corp_code": corp_code,
                "bsns_year": str(year),
                "reprt_code": reprt_code,
                "fs_div": fs_div,
            },
        )
        if data.get("status") != "000":
            continue
        result: dict[str, float] = {}
        for row in data.get("list", []):
            field = _match_field(row.get("account_id", ""), row.get("account_nm", ""))
            if field and field not in result:
                val = _num(row.get("thstrm_amount"))
                if val is not None:
                    result[field] = val
        if result:
            return result
    return {}


def _div(a, b):
    if a is None or b in (None, 0):
        return None
    return a / b


def compute_fundamentals(ticker: str, reports: dict[tuple[int, str], dict]) -> dict:
    """누적 보고서들 -> 단일 분기 환산 + 마진/YoY."""
    quarters_by_key: dict[tuple[int, int], dict] = {}
    years = sorted({y for (y, _) in reports})
    for year in years:
        prev_cum = {f: 0.0 for f in FLOW_FIELDS}
        for reprt_code, qnum, suffix in REPORTS:
            rep = reports.get((year, reprt_code))
            if not rep:
                continue
            q = {
                "period_end": f"{year}{suffix}",
                "form": {1: "분기보고서", 2: "반기보고서", 3: "분기보고서", 4: "사업보고서"}[qnum],
                "filed": None,
                "eps_diluted": rep.get("eps_diluted"),
                "shares_diluted": None,
                "shares_outstanding": None,
            }
            # flow: 누적값 차분
            for f in FLOW_FIELDS:
                cum = rep.get(f)
                q[f] = (cum - prev_cum[f]) if cum is not None else None
                if cum is not None:
                    prev_cum[f] = cum
            # instant: 그대로
            for f in INSTANT_FIELDS:
                q[f] = rep.get(f)
            rev = q.get("revenue")
            q["gross_margin"] = _div(q.get("gross_profit"), rev)
            q["operating_margin"] = _div(q.get("operating_income"), rev)
            q["net_margin"] = _div(q.get("net_income"), rev)
            q["revenue_yoy"] = None
            q["net_income_yoy"] = None
            quarters_by_key[(year, qnum)] = q

    # YoY: 전년 동일 분기
    for (year, qnum), q in quarters_by_key.items():
        prev = quarters_by_key.get((year - 1, qnum))
        if prev:
            if q.get("revenue") is not None and prev.get("revenue"):
                q["revenue_yoy"] = (q["revenue"] - prev["revenue"]) / abs(prev["revenue"])
            if q.get("net_income") is not None and prev.get("net_income"):
                q["net_income_yoy"] = (q["net_income"] - prev["net_income"]) / abs(prev["net_income"])

    order = ["period_end", "form", "filed", "revenue", "gross_profit", "operating_income",
             "net_income", "eps_diluted", "operating_cash_flow", "shares_diluted",
             "total_assets", "total_equity", "total_liabilities", "cash", "shares_outstanding",
             "gross_margin", "operating_margin", "net_margin", "revenue_yoy", "net_income_yoy"]
    quarters = [
        {k: q.get(k) for k in order}
        for _, q in sorted(quarters_by_key.items())
    ]
    return {"ticker": ticker, "asof": None, "currency": "KRW", "quarters": quarters}


def run(codes: list[str] | None = None, index: str = "kospi200",
        start_year: int | None = None, end_year: int | None = None,
        overwrite: bool = False) -> None:
    corpcodes = universe_kr.load_corpcodes() or universe_kr.fetch_dart_corpcodes()
    if codes is None:
        uni = io.load_json(config.KR / "universe" / f"{index}.json") or []
        codes = [c["code"] for c in uni]
    end_year = end_year or date.today().year
    start_year = start_year or (io.as_date(config.NEWS_START).year)
    out_dir = io.ensure_dir(config.KR / "fundamentals")
    http = Http(user_agent="SKYSH/1.0", rate_per_sec=4)
    print(f"[kr.fundamentals] {len(codes)}종목 {start_year}~{end_year} (증분={'off' if overwrite else 'on'})")
    ok = skipped = 0
    failed: list[str] = []
    for code in io.progress(codes, desc="kr.fundamentals"):
        info = corpcodes.get(code)
        if not info:
            continue
        if not overwrite and (out_dir / f"{code}.json").exists():
            skipped += 1
            continue
        try:
            reports: dict[tuple[int, str], dict] = {}
            for year in range(start_year, end_year + 1):
                for reprt_code, _, _ in REPORTS:
                    rep = retry_call(fetch_report, http, info["corp_code"], year, reprt_code)
                    if rep:
                        reports[(year, reprt_code)] = rep
            if reports:
                io.save_json(out_dir / f"{code}.json", compute_fundamentals(code, reports))
                ok += 1
        except Exception as e:
            failed.append(code)
            print(f"  ! {code}: {type(e).__name__}: {e}")
    io.report_failures(failed, "kr.fundamentals")
    print(f"[kr.fundamentals] 완료: {ok}/{len(codes)} (건너뜀 {skipped}, 실패 {len(failed)})")
