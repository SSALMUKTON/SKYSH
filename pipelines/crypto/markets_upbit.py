"""Upbit 마켓 목록(유니버스).

출력: data/crypto/universe/markets.json
  [{market, korean_name, english_name, market_warning}]
"""
from __future__ import annotations

from ..common import config, io
from ..common.http import Http

MARKET_ALL = "https://api.upbit.com/v1/market/all"


def fetch_markets(http: Http | None = None) -> list[dict]:
    http = http or Http(user_agent="SKYSH/1.0", rate_per_sec=config.UPBIT_RATE)
    data = http.get_json(MARKET_ALL, params={"isDetails": "true"})
    return [
        {
            "market": m.get("market"),
            "korean_name": m.get("korean_name", ""),
            "english_name": m.get("english_name", ""),
            "market_warning": m.get("market_warning", ""),
        }
        for m in data
    ]


def run(quote: str = "KRW") -> list[str]:
    markets = fetch_markets()
    io.save_json(config.CRYPTO / "universe" / "markets.json", markets)
    selected = [m["market"] for m in markets if m["market"].startswith(f"{quote}-")]
    print(f"[crypto.markets] 전체 {len(markets)}개, {quote} 마켓 {len(selected)}개 저장")
    return selected
