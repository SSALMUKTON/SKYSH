"""SKYSH 데이터 수집 파이프라인.

자산군별 수집기:
  - pipelines.us      : 미국 주식 (S&P 500) — yfinance / Alpaca / FRED / GDELT / SEC
  - pipelines.kr      : 국내 주식 — KIS / DART / KRX(pykrx) / ECOS
  - pipelines.crypto  : 코인 — Upbit

진입점: ``python -m pipelines.run <asset> <dataset> [options]``
"""

__all__ = ["common", "us", "kr", "crypto"]
