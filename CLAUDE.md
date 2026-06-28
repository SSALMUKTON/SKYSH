@AGENTS.md

# 데이터 수집 파이프라인 (`pipelines/`, `data/`)

이 저장소는 **故래소 Next.js 앱 + Python 데이터 수집 파이프라인**이 함께 있는 폴리글랏 레포다.
파이프라인은 앱과 **독립**적으로 동작하며, 복기/룰엔진이 쓸 과거 가격·뉴스·공시·재무·매크로를
자산군(미국/국내/코인)별로 **동일 스키마**로 수집한다. 상세 문서: `pipelines/README.md`.

## 실행
```bash
pip install -r requirements.txt
cp .env.example .env   # 파이프라인 키 채우기(전부 무료). 가격 수집은 키 불필요
python -m pipelines.run <us|kr|crypto|all> <dataset> [--start --end --overwrite --source]
# 예) python -m pipelines.run kr all          (KOSPI, 무계좌)
#     python -m pipelines.run us sec --no-facts
```

## 구조 / 소스
- **미국** `pipelines/us`: yfinance(가격) · Alpaca(뉴스) · FRED(매크로) · SEC(공시·재무: facts→fundamentals)
- **국내** `pipelines/kr`: **pykrx**(가격·무계좌·기본) · DART(공시·정형재무) · KRX(밸류에이션) · ECOS(매크로).
  KIS는 `--source kis`(실시간/주문, 계좌 필요)일 때만.
- **코인** `pipelines/crypto`: Upbit(일봉)
- **공통** `pipelines/common`: config / http(레이트리밋·재시도) / io(원자적저장·증분·실패요약) / universe

## 데이터 (`data/`, 커밋됨)
- `data/{us,kr,crypto}/` 자산군별. 가격 parquet은 3군 동일: 인덱스 `Date`(datetime64[ms]),
  컬럼 `Close/High/Low/Open/Volume`(일봉/수정주가).
- US: `prices` · `news` · `macro/fred` · `sec/{filings,facts,fundamentals,company_tickers}`
- KR: `prices` · `disclosures` · `fundamentals` · `valuation` · `macro/ecos` · `universe`
- crypto: `prices` · `universe`
- 2.4GB(git pack ~198MB)이나 파이프라인으로 재생성 가능. `.env`(비밀)는 커밋 금지(`.gitignore` `.env*`).

## 동작 규칙 / 주의 (수정 시 반드시 인지)
- **증분 수집**: 시계열은 마지막 저장일 이후만, 이미 최신이면 호출 자체 skip(주식은 주말 보정).
  스냅샷(SEC/DART)은 파일 있으면 종목 skip. 전체 재수집은 `--overwrite`.
- **rate limit**: 요청 4회 + 종목 3회 재시도 + 단계별 오류 격리(`_safe`) + 끝에 실패 목록 출력.
  남은 누락은 같은 명령 재실행으로 보완(시계열 과거 구간 갭은 `--overwrite` 필요).
- **KRX(pykrx) 변동성**: KRX가 종목목록·지수구성·밸류에이션 엔드포인트에 빈 응답을 줄 때가 있다 →
  **유니버스는 KRX KIND(`corpList.do`)** 로 받는다(안정). KOSPI200은 pykrx 지수구성이 되면 사용,
  안 되면 시장 전체 폴백. 가격(`get_market_ohlcv`)은 정상. valuation은 빈 응답이면 0건(비치명적).
  `pd.read_html` 에 **lxml 필요**.
- **SEC fundamentals**: facts에서 파생(분기 누적 차분으로 OCF·Q4 복원). 추출 로직 수정 후엔
  **로컬 facts로 재계산하면 됨(재다운로드 불필요)**. 외국 20-F 제출사는 quarters 비어있음(정상).
- **GDELT 제거됨**. 매크로는 US=FRED, KR=ECOS.

## 미결 항목
국내·코인 뉴스 소스 미정 / ECOS 통계코드 키로 실측 검증(+실업률·소비심리 추가) /
KRX valuation 엔드포인트 복구 시 재수집.
