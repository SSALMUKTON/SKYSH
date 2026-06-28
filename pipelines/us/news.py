"""미국 주식 뉴스 — Alpaca News API(Benzinga 소스).

출력: data/us/news/{YYYY-MM-DD}.json
  [{id, headline, summary, symbols[], source, url, created_at}]
심볼 필터 없이 해당 일자의 전체 뉴스를 수집(기존 데이터와 동일 방식).
"""
from __future__ import annotations

from datetime import date

from ..common import config, io
from ..common.http import Http, retry_call

NEWS_URL = "https://data.alpaca.markets/v1beta1/news"


def _client() -> Http:
    key = config.require(config.ALPACA_KEY, "ALPACA_API_KEY_ID")
    secret = config.require(config.ALPACA_SECRET, "ALPACA_API_SECRET_KEY")
    return Http(
        headers={"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret},
        rate_per_sec=5,
    )


def fetch_day(http: Http, day: date) -> list[dict]:
    start = f"{day.isoformat()}T00:00:00Z"
    end = f"{day.isoformat()}T23:59:59Z"
    items: list[dict] = []
    token = None
    while True:
        params = {
            "start": start,
            "end": end,
            "limit": 50,  # Alpaca 뉴스 최대 50/페이지
            "sort": "desc",
            "include_content": "false",
        }
        if token:
            params["page_token"] = token
        data = http.get_json(NEWS_URL, params=params)
        for n in data.get("news", []):
            items.append(
                {
                    "id": n.get("id"),
                    "headline": n.get("headline", ""),
                    "summary": n.get("summary", ""),
                    "symbols": n.get("symbols", []),
                    "source": n.get("source", ""),
                    "url": n.get("url", ""),
                    "created_at": n.get("created_at", ""),
                }
            )
        token = data.get("next_page_token")
        if not token:
            break
    return items


def run(start: str | None = None, end: str | None = None, overwrite: bool = False) -> None:
    start = start or config.NEWS_START
    end = end or date.today().isoformat()
    out_dir = io.ensure_dir(config.US / "news")
    have = set() if overwrite else io.existing_dates(out_dir, ".json")
    http = _client()
    days = [d for d in io.daterange(start, end) if d.isoformat() not in have]
    print(f"[us.news] {start}~{end} 중 신규 {len(days)}일 수집")
    failed: list[str] = []
    for d in io.progress(days, desc="us.news"):
        try:
            items = retry_call(fetch_day, http, d)
            io.save_json(out_dir / f"{d.isoformat()}.json", items)
        except Exception as e:
            failed.append(d.isoformat())
            print(f"  ! {d}: {type(e).__name__}: {e}")
    io.report_failures(failed, "us.news")
    print(f"[us.news] 완료 (실패 {len(failed)}일)")
