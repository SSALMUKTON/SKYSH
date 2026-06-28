"""통합 실행 CLI.

사용 예:
  python -m pipelines.run us all                # 미국 전체
  python -m pipelines.run us prices --tickers AAPL MSFT
  python -m pipelines.run us news --start 2026-01-01 --end 2026-06-01
  python -m pipelines.run us sec --no-facts
  python -m pipelines.run kr universe --index kospi200
  python -m pipelines.run kr all --index kospi200
  python -m pipelines.run crypto all --quote KRW
  python -m pipelines.run all                   # 3개 자산군 전체(키 필요)
  python -m pipelines.run all prices            # 3개 자산군 가격만(키 불필요)

dataset 목록:
  us     : prices | news | fred | sec | all
  kr     : universe | prices | disclosures | fundamentals | valuation | ecos | all
  crypto : markets | prices | all
"""
from __future__ import annotations

import argparse
import sys


def _safe(label: str, fn, *args, **kwargs) -> None:
    """단계별 실행을 격리: 한 dataset 실패가 나머지를 멈추지 않게 한다."""
    try:
        fn(*args, **kwargs)
    except Exception as e:
        print(f"[run] {label} 실패: {type(e).__name__}: {e} (다음 단계 계속)", file=sys.stderr)


def _run_us(ds: str, a: argparse.Namespace) -> None:
    from .us import prices, news, macro_fred, sec

    if ds in ("prices", "all"):
        _safe("us.prices", prices.run, tickers=a.tickers, start=a.start, end=a.end, overwrite=a.overwrite)
    if ds in ("news", "all"):
        _safe("us.news", news.run, start=a.start, end=a.end, overwrite=a.overwrite)
    if ds in ("fred", "all"):
        _safe("us.fred", macro_fred.run, start=a.start, overwrite=a.overwrite)
    if ds in ("sec", "all"):
        _safe("us.sec", sec.run, tickers=a.tickers, keep_facts=(False if a.no_facts else None),
              start=a.start, end=a.end, overwrite=a.overwrite)


def _run_kr(ds: str, a: argparse.Namespace) -> None:
    from .kr import (
        universe_kr,
        prices_kis,
        prices_pykrx,
        disclosures_dart,
        fundamentals_dart,
        valuation_krx,
        macro_ecos,
    )

    if ds in ("universe", "all"):
        _safe("kr.universe", universe_kr.run, index=a.index)
    if ds in ("prices", "all"):
        src = prices_kis if a.source == "kis" else prices_pykrx
        _safe("kr.prices", src.run, codes=a.codes, index=a.index, start=a.start, end=a.end,
              overwrite=a.overwrite)
    if ds in ("disclosures", "all"):
        _safe("kr.disclosures", disclosures_dart.run, codes=a.codes, index=a.index,
              bgn_de=a.start, end_de=a.end, overwrite=a.overwrite)
    if ds in ("fundamentals", "all"):
        _safe("kr.fundamentals", fundamentals_dart.run, codes=a.codes, index=a.index,
              start_year=int(a.start[:4]) if a.start else None,
              end_year=int(a.end[:4]) if a.end else None, overwrite=a.overwrite)
    if ds in ("valuation", "all"):
        _safe("kr.valuation", valuation_krx.run, codes=a.codes, index=a.index,
              start=a.start, end=a.end, overwrite=a.overwrite)
    if ds in ("ecos", "all"):
        _safe("kr.ecos", macro_ecos.run, start=a.start, end=a.end, overwrite=a.overwrite)


def _run_crypto(ds: str, a: argparse.Namespace) -> None:
    from .crypto import markets_upbit, prices_upbit

    if ds in ("markets", "all"):
        _safe("crypto.markets", markets_upbit.run, quote=a.quote)
    if ds in ("prices", "all"):
        _safe("crypto.prices", prices_upbit.run, quote=a.quote, start=a.start, end=a.end,
              overwrite=a.overwrite)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="pipelines.run", description="SKYSH 데이터 수집")
    p.add_argument("asset", choices=["us", "kr", "crypto", "all"])
    p.add_argument("dataset", nargs="?", default="all",
                   help="자산군별 dataset 또는 all. `all prices`면 3군 가격만 수집")
    p.add_argument("--start", default=None, help="시작일 YYYY-MM-DD")
    p.add_argument("--end", default=None, help="종료일 YYYY-MM-DD")
    p.add_argument("--tickers", nargs="*", default=None, help="(us) 종목 한정")
    p.add_argument("--codes", nargs="*", default=None, help="(kr) 종목코드 한정")
    p.add_argument("--index", default="kospi200", help="(kr) 유니버스: kospi200|kosdaq150|kospi|kosdaq|all")
    p.add_argument("--source", choices=["pykrx", "kis"], default="pykrx",
                   help="(kr.prices) 가격 소스: pykrx(무계좌, 기본) | kis(계좌 필요, 실시간 가능)")
    p.add_argument("--quote", default="KRW", help="(crypto) 기준화폐: KRW|BTC|USDT")
    p.add_argument("--no-facts", action="store_true", help="(us.sec) raw facts 저장 생략")
    p.add_argument("--overwrite", action="store_true",
                   help="증분 끄고 전체 재수집(기존 데이터 무시하고 다시 받음)")
    a = p.parse_args(argv)

    if a.asset == "all":
        # dataset 인자를 그대로 전달 → `all prices`면 3군 가격만, 기본(all)이면 전체.
        # prices 분기가 없는 자산군은 해당 dataset에서 자연히 skip된다.
        for fn in (_run_us, _run_kr, _run_crypto):
            try:
                fn(a.dataset, a)
            except Exception as e:
                print(f"[run] {fn.__name__} 실패: {type(e).__name__}: {e}", file=sys.stderr)
        return 0

    {"us": _run_us, "kr": _run_kr, "crypto": _run_crypto}[a.asset](a.dataset, a)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
