# SKYSH 데이터 파이프라인

투자 복기 서비스(주문 직전 원칙 위반 경고 + 거래 후 복기 → 새 원칙화)를 위한 데이터 수집 계층.
미국 주식 · 국내 주식 · 코인 3개 자산군의 가격/뉴스/공시/재무/매크로 데이터를 동일한 형식으로 수집한다.

## 디렉토리 구조

```
data/
  us/                      # 미국 주식 (S&P 500 풀)
    prices/{TICKER}.parquet          # yfinance OHLCV (수정주가)
    news/{YYYY-MM-DD}.json            # Alpaca(Benzinga) 뉴스
    macro/fred/{SERIES}.parquet       # FRED 경제지표
    sec/company_tickers.json          # {TICKER: CIK}
    sec/filings/{TICKER}.json         # 공시 제출 이력(메타)
    sec/facts/{TICKER}.json           # XBRL companyfacts 원본(옵션)
    sec/fundamentals/{TICKER}.json    # 분기 재무 요약(facts 파생)
  kr/                      # 국내 주식 (KOSPI200 기본)
    prices/{CODE}.parquet            # 일봉 OHLCV (기본 pykrx/무계좌, 옵션 KIS)
    disclosures/{CODE}.json          # DART 공시검색 목록   (US filings 대응)
    fundamentals/{CODE}.json         # DART 정형 재무제표   (US fundamentals 대응)
    valuation/{CODE}.parquet         # KRX PER/PBR/시총(일별)
    macro/ecos/{SERIES}.parquet      # 한국은행 ECOS        (US FRED 대응)
    universe/{index}.json, dart_corpcodes.json
  crypto/                  # 코인 (Upbit)
    prices/{MARKET}.parquet          # Upbit 일봉 OHLCV
    universe/markets.json
```

가격 parquet 은 3개 자산군 모두 동일 스키마: 인덱스 `Date`(datetime64[ms]), 컬럼 `Close,High,Low,Open,Volume`.

## 데이터 소스 매핑

| 데이터 | 미국(US) | 국내(KR) | 코인 |
|---|---|---|---|
| 가격(일봉 OHLCV) | yfinance | **KRX(pykrx)** 기본·무계좌 / KIS 옵션 | Upbit candles |
| 뉴스 | Alpaca | *(미정 — 아래 참고)* | *(미정)* |
| 공시 목록 | SEC submissions | **DART** 공시검색 | — |
| 재무(정형) | SEC facts → 가공 | **DART** fnlttSinglAcntAll | — |
| 밸류에이션 | (fundamentals 내) | **KRX**(pykrx) PER/PBR/시총 | — |
| 매크로 | FRED | **ECOS**(한국은행) | — |

### 왜 DART 단독이 아니라 DART정형+KRX+ECOS 인가
- `fundamentals` ← **DART 단일회사 전체재무제표**(`fnlttSinglAcntAll`): 매출/영업이익/순이익 등 계정이 이미 정규화돼 내려옴(미국 fundamentals 와 동일 역할). 누적(반기·3분기)은 차분해 단일 분기로 환산.
- `filings` ← **DART 공시검색**(`list.json`).
- 밸류에이션 ← **KRX 정보데이터시스템**: DART 엔 없는 PER/PBR/배당수익률/시총을 일별 제공.
- 매크로 ← **한국은행 ECOS**: 기준금리/환율/CPI/국고채 등 FRED 의 한국판.

## 설치

```bash
pip install -r requirements.txt
cp .env.example .env      # 후 값 입력
```

## 환경변수(.env) — 키 발급처

| 키 | 발급처 | 비고 |
|---|---|---|
| `ALPACA_API_KEY_ID/SECRET` | alpaca.markets | 미국 뉴스, 무료 |
| `FRED_API_KEY` | fred.stlouisfed.org/docs/api | 무료 |
| `SEC_USER_AGENT` | (키 불필요) | 연락처 이메일 필수 |
| `KIS_APP_KEY/SECRET` | apiportal.koreainvestment.com | **선택**. `--source kis`(실시간/주문)에만 필요. 기본 pykrx는 불필요 |
| `DART_API_KEY` | opendart.fss.or.kr | 무료 |
| `ECOS_API_KEY` | ecos.bok.or.kr/api | 무료 |
| (Upbit) | — | 시세는 키 불필요 |

## 사용법

```bash
# 미국
python -m pipelines.run us all --start 2024-01-01 --end 2024-12-31
python -m pipelines.run us prices --tickers AAPL MSFT
python -m pipelines.run us news --start 2026-01-01 --end 2026-06-01
python -m pipelines.run us sec --no-facts --start 2024-01-01   # raw facts 저장 생략(~2GB)

# 국내 (먼저 universe → 나머지). 가격은 기본 pykrx(무계좌)
python -m pipelines.run kr universe --index kospi200
python -m pipelines.run kr all --index kospi200 --start 2024-01-01
python -m pipelines.run kr prices --source kis        # 실시간 가능한 KIS로 받고 싶을 때(계좌 필요)

# 코인
python -m pipelines.run crypto all --quote KRW --start 2024-01-01

# 전부
python -m pipelines.run all --start 2024-01-01
```

### `--start` / `--end` 적용 범위
모든 자산군 공통 플래그(YYYY-MM-DD). 데이터 종류별 의미:

| dataset | start/end 의미 |
|---|---|
| us/kr/crypto **prices**, kr **valuation** | 해당 기간 시세만 수집 → **수집량·시간 직접 절감** |
| us **news** | 해당 일자 뉴스만 |
| us **sec** | filings=filingDate, fundamentals=period_end 기준 **출력 필터**. ⚠️raw facts 는 XBRL 전체 스냅샷이라 기간과 무관(파일 크기 동일) |
| kr **disclosures** | 공시 접수일(bgn_de/end_de) |
| kr **fundamentals** | 연도(start의 YYYY ~ end의 YYYY)만 조회 |
| us **fred**, kr **ecos** | start 이후 관측치(end 무시, 최신까지) |

### 증분 수집 (같은 명령 재실행 시 이미 받은 데이터는 다시 안 받음)
데이터 형태별로 자동 동작하며, `--overwrite` 로 끄고 전체 재수집할 수 있다.

| 형태 | 데이터 | 재실행 동작 |
|---|---|---|
| 시계열 parquet | 가격(US/KR/코인)·valuation·FRED·ECOS | 이미 최신이면 **호출 자체 skip**(주식은 주말/공휴 보정), 아니면 **마지막 저장일→오늘 델타만** |
| 날짜 파일 | us news | 이미 받은 **날짜 파일 skip**, 빠진 날짜만 |
| 스냅샷 | us sec(filings/facts/fundamentals)·kr disclosures/fundamentals | 파일 있으면 **종목 통째로 skip**(다운로드 X) |

- 검증: us prices 재실행 시 최신 종목은 `건너뜀`으로 네트워크 호출 0(즉시 종료). SEC 재실행 0.17초(skip) vs `--overwrite` 0.95초(재수집).
- ⚠️ "최신" 판단은 마지막 저장일 ≥ 목표 종료일 기준. 장중에 당일 봉을 갱신하려면 `--overwrite` 또는 `--start` 지정.
- ⚠️ 스냅샷(SEC·DART 재무)은 분기마다 갱신되므로, 최신 실적 반영하려면 주기적으로 `--overwrite` 1회 실행 권장.

```bash
python -m pipelines.run us sec                 # 빠진 종목만 받음(있으면 skip)
python -m pipelines.run us sec --overwrite      # 전 종목 최신으로 강제 갱신
```

### rate limit / 실패 처리 (결측 방지)
- **요청 단위 재시도**: API 소스(Alpaca·FRED·SEC·DART·ECOS·Upbit)는 429/5xx 를 자동 재시도(4회, 지수 백오프, `Retry-After` 준수).
- **종목 단위 재시도**: 모든 수집기는 종목/일자별 fetch 를 `retry_call`(기본 3회, 백오프)로 감싸 yfinance·pykrx 같은 자체 세션 호출의 일시 throttle 도 흡수.
- **원자적 저장**: 한 종목을 **완전히 받았을 때만** 파일 저장 → 부분/깨진 파일이 생기지 않음(받았으면 그 구간은 완전, 못 받았으면 파일 없음).
- **실패 격리 + 요약**: 한 종목 실패가 전체를 멈추지 않고, 끝에 `실패 N건: [...]` 목록을 출력.
- **재실행이 결측 보완(최종 안전망)**: 실패/누락 종목은 같은 명령 재실행 시 증분 로직이 자동으로 다시 받음(시계열=마지막일부터, 스냅샷=없는 파일만).
- ⚠️ 단, **시계열 중간(과거 구간)의 결측은 증분이 자동 복구하지 않음**(증분은 마지막일 이후만 봄). 과거 구멍을 메우려면 `--overwrite` 또는 그 이전 `--start` 지정.

## 검증 완료 (무키 소스 실측)
- S&P500 유니버스 503종목, `BRK-B` 정규화 정상
- SEC filings/fundamentals 스키마 + 값이 기존 데이터와 **정확히 일치**(OCF·Q4 누적차분 포함)
- yfinance·Upbit 가격 parquet 스키마 기존과 일치
- CLI(`crypto markets`) end-to-end 저장 확인

## 알려진 한계 / 결정 필요 사항

1. **국내/코인 뉴스 소스 미정**: Alpaca 같은 무료 정규화 한국/코인 뉴스 API 가 마땅치 않다.
   후보: 네이버 뉴스 API, 한경/연합 RSS, 또는 DART 실시간공시를 뉴스 프록시로.
2. **ECOS 통계/항목 코드**: `macro_ecos.SERIES` 에 기준금리·국고채 3년/10년·CD·환율·CPI 를
   FRED 대응으로 넣었으나(우측 주석에 FRED 시리즈 표기), 정확한 코드는 ECOS 키로 실측 검증 필요.
   실업률(UNRATE)·소비심리(UMCSENT) 대응은 코드 확인 후 주석 해제로 추가.
3. **KR 가격 소스**: 기본 **pykrx(무계좌·무키, 과거 일봉만)**. 실시간/분·틱·주문이 필요하면
   `--source kis`(한국투자증권 계좌+앱키 필요, 모의는 `KIS_ENV=paper`). 둘 다 출력 스키마 동일.
4. **fundamentals 커버리지**: 미국은 전체 분기 이력 수집(기존 파일은 최근 8분기로 잘려 있었음). 필요 시 최근 N분기로 절단 가능.
5. **비12월 결산 국내사**: KR fundamentals period_end 는 12월 결산 가정 — 일부 종목은 어긋날 수 있음.
6. **KRX(pykrx) 엔드포인트 변동성**: KRX 가 종목목록/지수구성/밸류에이션(PER·PBR·시총) 엔드포인트에
   빈 응답을 줄 때가 있음. 그래서 **유니버스는 KRX KIND 상장법인목록(corpList.do)**으로 받는다(안정적).
   - `--index kospi200/kosdaq150` 은 pykrx 지수구성이 되면 그걸, 안 되면 **해당 시장 전체 상장**으로 자동 폴백(로그 표시).
   - **valuation(PER/PBR/시총)** 은 KRX 가 빈 응답이면 그 회차엔 0건(비치명적) — 추후 복구 시 재실행하면 채워짐.
   - 가격(`get_market_ohlcv`)은 정상 동작.

> GDELT(글로벌/지정학 뉴스)는 제거됨. 기존 `data/us/macro/gdelt/` 데이터 폴더는 남아 있으니 불필요하면 삭제하면 된다.

## 다음 단계(복기 서비스 연결)
이 수집 계층 위에, 주문 직전 원칙 위반 검사(룰 엔진)와 거래 후 복기→원칙 생성(LLM) 레이어가 올라간다.
거래 대상별로 prices(체결가 맥락)·disclosures/filings(공시 이벤트)·fundamentals(재무 맥락)·macro(시장 환경)를 시점 조인해 사용한다.
