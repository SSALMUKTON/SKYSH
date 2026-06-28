"""SEC 공시/재무 — EDGAR REST API.

출력:
  data/us/sec/company_tickers.json       {TICKER: CIK(10자리)}
  data/us/sec/filings/{TICKER}.json       공시 제출 이력(메타데이터)
  data/us/sec/facts/{TICKER}.json         XBRL companyfacts 원본(옵션)
  data/us/sec/fundamentals/{TICKER}.json  facts 에서 파생한 분기 재무 요약

facts -> fundamentals 파생 로직은 기존 fundamentals 스키마(분기별 매출/이익/마진/YoY)
를 재현한다. raw facts 저장 여부는 config.SEC_KEEP_FACTS 로 제어.
"""
from __future__ import annotations

from datetime import date, datetime

from ..common import config, io
from ..common.http import Http, retry_call
from ..common.universe import get_sp500

TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"


def _client() -> Http:
    return Http(user_agent=config.SEC_USER_AGENT, rate_per_sec=config.SEC_RATE)


# ── 티커 ↔ CIK 매핑 ──────────────────────────────────
def fetch_company_tickers(http: Http) -> dict[str, str]:
    """SEC 전체 {TICKER: CIK(10자리)} 매핑을 받아 저장하고 반환."""
    raw = http.get_json(TICKERS_URL)
    mapping: dict[str, str] = {}
    for row in raw.values():
        ticker = str(row["ticker"]).upper()
        mapping[ticker] = f"{int(row['cik_str']):010d}"
    io.save_json(config.US / "sec" / "company_tickers.json", mapping, indent=2)
    return mapping


# ── 공시 이력(filings) ───────────────────────────────
def _filing_url(cik: str, accession: str, doc: str) -> str:
    acc_nodash = accession.replace("-", "")
    return (
        f"https://www.sec.gov/Archives/edgar/data/"
        f"{int(cik)}/{acc_nodash}/{doc}"
    )


def fetch_filings(http: Http, cik: str) -> list[dict]:
    data = http.get_json(SUBMISSIONS_URL.format(cik=cik))
    recent = data.get("filings", {}).get("recent", {})
    n = len(recent.get("accessionNumber", []))
    out = []
    for i in range(n):
        accession = recent["accessionNumber"][i]
        doc = recent["primaryDocument"][i]
        out.append(
            {
                "form": recent["form"][i],
                "filingDate": recent["filingDate"][i],
                "reportDate": recent.get("reportDate", [""] * n)[i],
                "accessionNumber": accession,
                "primaryDocument": doc,
                "primaryDocDescription": recent.get("primaryDocDescription", [""] * n)[i],
                "items": recent.get("items", [""] * n)[i],
                "url": _filing_url(cik, accession, doc) if doc else "",
            }
        )
    return out


# ── 재무 facts -> fundamentals ───────────────────────
# us-gaap 개념 별칭(회사마다 태그가 다름 — 우선순위 순서로 탐색)
FLOW_CONCEPTS = {
    "revenue": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerIncludingAssessedTax",
    ],
    "gross_profit": ["GrossProfit"],
    "operating_income": ["OperatingIncomeLoss"],
    "net_income": ["NetIncomeLoss", "ProfitLoss"],
    "operating_cash_flow": ["NetCashProvidedByUsedInOperatingActivities"],
}
INSTANT_CONCEPTS = {
    "total_assets": ["Assets"],
    "total_equity": ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    "total_liabilities": ["Liabilities"],
    "cash": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
}
EPS_CONCEPTS = ["EarningsPerShareDiluted"]
SHARES_CONCEPTS = ["WeightedAverageNumberOfDilutedSharesOutstanding"]


def _gaap(facts: dict, concept: str) -> dict | None:
    return facts.get("facts", {}).get("us-gaap", {}).get(concept)


def _first_unit(node: dict) -> list[dict]:
    units = node.get("units", {})
    for key in ("USD", "USD/shares", "shares", "pure"):
        if key in units:
            return units[key]
    return next(iter(units.values()), [])


def _quarter_flows(facts: dict, aliases: list[str], allow_ytd: bool = True) -> dict[str, float]:
    """기간(flow) 개념 -> {period_end: 단일분기 값}.

    손익 항목은 10-Q 에 3개월 값이 직접 보고되지만(direct), 현금흐름표·연간(Q4) 등은
    누적(YTD)값만 있다. 같은 회계연도 시작일(start)을 공유하는 누적 사다리를 차분해
    분기값을 복원한다. EPS·가중평균주식수처럼 가산 불가한 항목은 allow_ytd=False.
    """
    from collections import defaultdict

    entries: list[dict] = []
    for concept in aliases:
        node = _gaap(facts, concept)
        if not node:
            continue
        es = [
            it for it in _first_unit(node)
            if it.get("form") in ("10-Q", "10-K") and it.get("start") and it.get("end")
        ]
        if es:
            entries = es
            break
    if not entries:
        return {}

    direct: dict[str, float] = {}
    ladders: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for it in entries:
        try:
            days = (datetime.fromisoformat(it["end"]) - datetime.fromisoformat(it["start"])).days
        except ValueError:
            continue
        val = float(it["val"])
        if days <= 100:
            direct[it["end"]] = val  # 직접 보고된 단일 분기
        if allow_ytd:
            ladders[it["start"]].append((it["end"], val))

    derived: dict[str, float] = {}
    if allow_ytd:
        for _start, lst in ladders.items():
            prev = 0.0
            for end, val in sorted(dict(lst).items()):  # end 중복은 최신값 사용
                derived.setdefault(end, val - prev)
                prev = val

    out = dict(derived)
    out.update(direct)  # 직접 보고값 우선
    return out


def _instant_values(facts: dict, aliases: list[str]) -> dict[str, float]:
    """시점(instant) 개념: {end_date: val}."""
    out: dict[str, float] = {}
    for concept in aliases:
        node = _gaap(facts, concept)
        if not node:
            continue
        for item in _first_unit(node):
            if item.get("form") not in ("10-Q", "10-K"):
                continue
            end = item.get("end")
            if end and "start" not in item:
                out[end] = float(item["val"])
        if out:
            break
    return out


def _meta_by_end(facts: dict) -> dict[str, dict]:
    """period_end -> {form, filed} (보고서 메타)."""
    meta: dict[str, dict] = {}
    node = _gaap(facts, "NetIncomeLoss") or _gaap(facts, "Revenues")
    if node:
        for item in _first_unit(node):
            end = item.get("end")
            if end and item.get("form") in ("10-Q", "10-K"):
                meta.setdefault(end, {"form": item.get("form"), "filed": item.get("filed")})
    return meta


def _div(a, b):
    if a is None or b in (None, 0):
        return None
    return a / b


def compute_fundamentals(ticker: str, facts: dict) -> dict:
    flows = {k: _quarter_flows(facts, v) for k, v in FLOW_CONCEPTS.items()}
    insts = {k: _instant_values(facts, v) for k, v in INSTANT_CONCEPTS.items()}
    eps = _quarter_flows(facts, EPS_CONCEPTS, allow_ytd=False)  # 비율 -> 차분 금지
    shares = _quarter_flows(facts, SHARES_CONCEPTS, allow_ytd=False)  # 가중평균 -> 차분 금지
    meta = _meta_by_end(facts)

    # 분기 기준일 = 매출 또는 순이익이 잡힌 모든 period_end
    ends = sorted(set(flows["revenue"]) | set(flows["net_income"]))

    quarters = []
    by_end: dict[str, dict] = {}
    for end in ends:
        rev = flows["revenue"].get(end)
        ni = flows["net_income"].get(end)
        q = {
            "period_end": end,
            "form": meta.get(end, {}).get("form"),
            "filed": meta.get(end, {}).get("filed"),
            "revenue": rev,
            "gross_profit": flows["gross_profit"].get(end),
            "operating_income": flows["operating_income"].get(end),
            "net_income": ni,
            "eps_diluted": eps.get(end),
            "operating_cash_flow": flows["operating_cash_flow"].get(end),
            "shares_diluted": shares.get(end),
            "total_assets": insts["total_assets"].get(end),
            "total_equity": insts["total_equity"].get(end),
            "total_liabilities": insts["total_liabilities"].get(end),
            "cash": insts["cash"].get(end),
            "shares_outstanding": None,
            "gross_margin": _div(flows["gross_profit"].get(end), rev),
            "operating_margin": _div(flows["operating_income"].get(end), rev),
            "net_margin": _div(ni, rev),
            "revenue_yoy": None,
            "net_income_yoy": None,
        }
        quarters.append(q)
        by_end[end] = q

    # 전년 동기 대비(YoY): period_end 에서 약 1년 전 분기 매칭
    for q in quarters:
        try:
            d = datetime.fromisoformat(q["period_end"]).date()
        except ValueError:
            continue
        for prev in by_end:
            pd_ = datetime.fromisoformat(prev).date()
            if 360 <= (d - pd_).days <= 372:
                q["revenue_yoy"] = _div_growth(q["revenue"], by_end[prev]["revenue"])
                q["net_income_yoy"] = _div_growth(q["net_income"], by_end[prev]["net_income"])
                break

    return {"ticker": ticker, "asof": None, "currency": "USD", "quarters": quarters}


def _div_growth(cur, prev):
    if cur is None or prev in (None, 0):
        return None
    return (cur - prev) / abs(prev)


def _within(datestr: str | None, start: str | None, end: str | None) -> bool:
    """ISO 날짜 문자열(YYYY-MM-DD)이 [start, end] 안에 있는지(사전식 비교)."""
    if not datestr:
        return False
    if start and datestr < start:
        return False
    if end and datestr > end:
        return False
    return True


# ── 오케스트레이션 ───────────────────────────────────
def run(
    tickers: list[str] | None = None,
    keep_facts: bool | None = None,
    do_filings: bool = True,
    do_fundamentals: bool = True,
    start: str | None = None,
    end: str | None = None,
    overwrite: bool = False,
) -> None:
    """SEC 수집.

    start/end (YYYY-MM-DD): filings 는 filingDate, fundamentals 는 period_end 기준으로
    해당 기간만 저장한다. raw facts 는 XBRL 전체 이력 스냅샷이라 기간 필터 대상이 아니다
    (다운로드 양도 기간과 무관 — 기간을 좁혀도 facts 파일 크기는 동일).

    증분: 기본은 이미 저장된 출력 파일은 건너뛴다(다운로드 안 함). 최신 분기로 갱신하려면
    overwrite=True. (분기마다 갱신되므로 주기적으로 overwrite 권장.)
    """
    tickers = tickers or get_sp500()
    keep_facts = config.SEC_KEEP_FACTS if keep_facts is None else keep_facts
    http = _client()

    print("[us.sec] company_tickers 매핑 갱신")
    mapping = fetch_company_tickers(http)

    f_dir = io.ensure_dir(config.US / "sec" / "filings")
    fa_dir = io.ensure_dir(config.US / "sec" / "facts")
    fu_dir = io.ensure_dir(config.US / "sec" / "fundamentals")

    rng = f" [{start or '~'} ~ {end or '~'}]" if (start or end) else ""
    missing = []
    failed: list[str] = []
    skipped = 0
    print(f"[us.sec] {len(tickers)}개 종목 수집 (keep_facts={keep_facts}, 증분={'off' if overwrite else 'on'}){rng}")
    for t in io.progress(tickers, desc="us.sec"):
        cik = mapping.get(t.upper())
        if not cik:
            missing.append(t)
            continue
        # 이미 있는 출력은 건너뛰기(필요한 것만 다운로드)
        need_filings = do_filings and (overwrite or not (f_dir / f"{t}.json").exists())
        need_fund = do_fundamentals and (overwrite or not (fu_dir / f"{t}.json").exists())
        need_facts_file = keep_facts and (overwrite or not (fa_dir / f"{t}.json").exists())
        if not (need_filings or need_fund or need_facts_file):
            skipped += 1
            continue
        try:
            if need_filings:
                fil = retry_call(fetch_filings, http, cik)
                if start or end:
                    fil = [f for f in fil if _within(f.get("filingDate"), start, end)]
                io.save_json(f_dir / f"{t}.json", fil)
            if need_fund or need_facts_file:
                facts = retry_call(http.get_json, FACTS_URL.format(cik=cik))
                if need_facts_file:
                    io.save_json(fa_dir / f"{t}.json", facts, indent=None)
                if need_fund:
                    fund = compute_fundamentals(t, facts)
                    if start or end:
                        fund["quarters"] = [
                            q for q in fund["quarters"] if _within(q.get("period_end"), start, end)
                        ]
                    io.save_json(fu_dir / f"{t}.json", fund)
        except Exception as e:
            failed.append(t)
            print(f"  ! {t} (CIK {cik}): {type(e).__name__}: {e}")
    if missing:
        print(f"[us.sec] CIK 매핑 없음 {len(missing)}종목: {', '.join(missing[:15])}...")
    io.report_failures(failed, "us.sec")
    print(f"[us.sec] 완료 (건너뜀 {skipped}, 실패 {len(failed)})")
