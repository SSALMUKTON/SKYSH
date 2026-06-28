"""국내 주식 수집기.

datasets:
  universe     : KRX 종목 목록 + DART corp_code 매핑 -> data/kr/universe/
  prices       : 일봉 OHLCV (기본 pykrx/무계좌, 옵션 KIS) -> data/kr/prices/{CODE}.parquet
  disclosures  : DART 공시검색(목록)                   -> data/kr/disclosures/{CODE}.json   (US filings 대응)
  fundamentals : DART 정형 재무제표(분기)              -> data/kr/fundamentals/{CODE}.json  (US fundamentals 대응)
  valuation    : KRX PER/PBR/시총(일별)                -> data/kr/valuation/{CODE}.parquet
  ecos         : 한국은행 ECOS 매크로                   -> data/kr/macro/ecos/{SERIES}.parquet (US FRED 대응)
"""

__all__ = [
    "universe_kr",
    "prices_pykrx",
    "prices_kis",
    "disclosures_dart",
    "fundamentals_dart",
    "valuation_krx",
    "macro_ecos",
]
