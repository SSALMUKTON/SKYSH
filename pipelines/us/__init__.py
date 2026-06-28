"""미국 주식(S&P 500) 수집기.

datasets:
  prices   : yfinance OHLCV          -> data/us/prices/{TICKER}.parquet
  news     : Alpaca(Benzinga) 뉴스   -> data/us/news/{YYYY-MM-DD}.json
  fred     : FRED 매크로 지표         -> data/us/macro/fred/{SERIES}.parquet
  sec      : SEC 공시/재무            -> data/us/sec/{filings,facts,fundamentals}/{TICKER}.json
"""

__all__ = ["prices", "news", "macro_fred", "sec"]
