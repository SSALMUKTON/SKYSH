"""전역 설정: 경로 / 환경변수 / API 키 / 기본 날짜 범위.

.env 파일을 자동 로드한다(외부 의존성 없는 경량 파서). 이미 설정된 환경변수는
덮어쓰지 않는다(setdefault).
"""
from __future__ import annotations

import os
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, val)


# ── 경로 ─────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
_load_dotenv(ROOT / ".env")

DATA = Path(os.environ.get("SKYSH_DATA_DIR") or (ROOT / "data"))
US = DATA / "us"
KR = DATA / "kr"
CRYPTO = DATA / "crypto"


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    v = os.environ.get(key)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


# ── 기본 날짜 범위 ───────────────────────────────────
PRICES_START = env("SKYSH_PRICES_START", "2020-01-01")
NEWS_START = env("SKYSH_NEWS_START", "2020-01-01")
MACRO_START = env("SKYSH_MACRO_START", "2019-01-01")

# ── 미국(US) ─────────────────────────────────────────
ALPACA_KEY = env("ALPACA_API_KEY_ID")
ALPACA_SECRET = env("ALPACA_API_SECRET_KEY")
FRED_API_KEY = env("FRED_API_KEY")
SEC_USER_AGENT = env("SEC_USER_AGENT", "SKYSH research <example@example.com>")
SEC_KEEP_FACTS = env_bool("SKYSH_SEC_KEEP_FACTS", True)
SEC_RATE = 8  # SEC 권장 한도 10 req/s 미만으로 유지

# ── 국내(KR) ─────────────────────────────────────────
KIS_APP_KEY = env("KIS_APP_KEY")
KIS_APP_SECRET = env("KIS_APP_SECRET")
KIS_ENV = env("KIS_ENV", "prod")  # prod | paper
DART_API_KEY = env("DART_API_KEY")
ECOS_API_KEY = env("ECOS_API_KEY")

# ── 코인(Crypto) ─────────────────────────────────────
UPBIT_RATE = 8  # Upbit 공개 API 한도(초당 ~10) 미만으로 유지


def require(value: str | None, name: str) -> str:
    """필수 환경변수 확인. 없으면 친절한 에러."""
    if not value:
        raise RuntimeError(
            f"환경변수 {name} 가 설정되지 않았습니다. .env 파일에 값을 채워주세요 "
            f"(.env.example 참고)."
        )
    return value
