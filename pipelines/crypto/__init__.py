"""코인 수집기 — Upbit 공개 API.

datasets:
  markets : 마켓 목록        -> data/crypto/universe/markets.json
  prices  : 일봉 OHLCV        -> data/crypto/prices/{MARKET}.parquet
"""

__all__ = ["markets_upbit", "prices_upbit"]
