"""레이트리밋 + 재시도가 적용된 HTTP 클라이언트."""
from __future__ import annotations

import threading
import time

import requests
from requests.adapters import HTTPAdapter

try:  # urllib3 v1/v2 호환
    from urllib3.util.retry import Retry
except Exception:  # pragma: no cover
    from requests.packages.urllib3.util.retry import Retry  # type: ignore


def retry_call(fn, *args, attempts: int = 3, base_wait: float = 2.0, **kwargs):
    """fn 을 예외 발생 시 재시도(지수 백오프). yfinance/pykrx 처럼 자체 세션을 쓰는
    호출에도 종목 단위 재시도를 더해준다. 모두 실패하면 마지막 예외를 올린다.
    """
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn(*args, **kwargs)
        except Exception as e:  # noqa: BLE001 - rate limit/네트워크 등 모두 재시도
            last = e
            if i < attempts - 1:
                time.sleep(base_wait * (2 ** i))
    raise last  # type: ignore[misc]


class RateLimiter:
    """초당 호출 수를 제한하는 간단한 최소-간격 리미터(스레드 안전)."""

    def __init__(self, rate_per_sec: float | None):
        self.min_interval = (1.0 / rate_per_sec) if rate_per_sec else 0.0
        self._lock = threading.Lock()
        self._last = 0.0

    def wait(self) -> None:
        if self.min_interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            sleep_for = self._last + self.min_interval - now
            if sleep_for > 0:
                time.sleep(sleep_for)
            self._last = time.monotonic()


def _make_session(user_agent: str | None, retries: int, backoff: float) -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=backoff,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=frozenset(["GET", "POST"]),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    if user_agent:
        s.headers["User-Agent"] = user_agent
    return s


class Http:
    """공유 세션 래퍼. 모든 수집기가 이 클래스로 외부 API를 호출한다."""

    def __init__(
        self,
        user_agent: str | None = "SKYSH/1.0",
        rate_per_sec: float | None = None,
        retries: int = 4,
        backoff: float = 1.5,
        headers: dict | None = None,
    ):
        self.session = _make_session(user_agent, retries, backoff)
        if headers:
            self.session.headers.update(headers)
        self.limiter = RateLimiter(rate_per_sec)

    def get(self, url: str, *, timeout: float = 30, **kw) -> requests.Response:
        self.limiter.wait()
        r = self.session.get(url, timeout=timeout, **kw)
        r.raise_for_status()
        return r

    def post(self, url: str, *, timeout: float = 30, **kw) -> requests.Response:
        self.limiter.wait()
        r = self.session.post(url, timeout=timeout, **kw)
        r.raise_for_status()
        return r

    def get_json(self, url: str, **kw):
        return self.get(url, **kw).json()

    def post_json(self, url: str, **kw):
        return self.post(url, **kw).json()
