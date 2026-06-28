"""입출력 헬퍼: 원자적 JSON/Parquet 저장, 시계열 증분 병합, 날짜 유틸."""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable, Iterator

import pandas as pd


# ── 디렉토리 ─────────────────────────────────────────
def ensure_dir(p: str | Path) -> Path:
    p = Path(p)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ── JSON ─────────────────────────────────────────────
def save_json(path: str | Path, obj, indent: int | None = 2) -> Path:
    path = Path(path)
    ensure_dir(path.parent)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent)
    os.replace(tmp, path)
    return path


def load_json(path: str | Path, default=None):
    path = Path(path)
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── Parquet ──────────────────────────────────────────
def save_parquet(df: pd.DataFrame, path: str | Path) -> Path:
    path = Path(path)
    ensure_dir(path.parent)
    tmp = path.with_name(path.name + ".tmp")
    df.to_parquet(tmp)
    os.replace(tmp, path)
    return path


def last_date(path: str | Path) -> date | None:
    """기존 시계열 parquet의 마지막 인덱스 날짜(없으면 None) — 증분 수집용."""
    path = Path(path)
    if not path.exists():
        return None
    try:
        df = pd.read_parquet(path, columns=[])  # 인덱스만
    except Exception:
        df = pd.read_parquet(path)
    if len(df.index) == 0:
        return None
    return pd.to_datetime(df.index).max().date()


def fetch_start(path: str | Path, requested_start: str | None, end: str | None = None,
                overwrite: bool = False, weekend_aware: bool = False) -> tuple[str | None, bool]:
    """증분 수집용 시작일 계산. 반환 (eff_start, skip).

    - overwrite=True      → (requested_start, False)  전체 재수집
    - 기존 파일 없음       → (requested_start, False)
    - 이미 최신(마지막 저장일 ≥ 목표 종료일) → (None, True)  더 받을 것 없음 → 건너뜀
    - 그 외               → (마지막저장일.isoformat(), False)  델타만 수집

    weekend_aware: end 미지정 시 목표일을 직전 영업일로 보정(주식용; 코인은 False).
    """
    if overwrite:
        return requested_start, False
    ld = last_date(path)
    if ld is None:
        return requested_start, False
    if end:
        target = as_date(end)
    else:
        target = date.today()
        if weekend_aware:
            while target.weekday() >= 5:  # 토(5)/일(6) → 직전 금요일
                target -= timedelta(days=1)
    if ld >= target:
        return None, True
    return ld.isoformat(), False


def merge_timeseries(path: str | Path, new_df: pd.DataFrame) -> pd.DataFrame:
    """기존 parquet에 새 행을 증분 병합한다(인덱스 기준, 중복은 최신 우선)."""
    path = Path(path)
    if path.exists():
        old = pd.read_parquet(path)
        combined = pd.concat([old, new_df])
        combined = combined[~combined.index.duplicated(keep="last")].sort_index()
    else:
        combined = new_df.sort_index()
    save_parquet(combined, path)
    return combined


# ── 날짜 ─────────────────────────────────────────────
def as_date(d: str | date | datetime) -> date:
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    return datetime.strptime(d, "%Y-%m-%d").date()


def daterange(start: str | date, end: str | date) -> Iterator[date]:
    cur, last = as_date(start), as_date(end)
    while cur <= last:
        yield cur
        cur += timedelta(days=1)


def mondays(start: str | date, end: str | date) -> Iterator[date]:
    """[start, end] 구간 안의 월요일들(주간 스냅샷용)."""
    cur, last = as_date(start), as_date(end)
    cur -= timedelta(days=cur.weekday())  # 그 주 월요일로 정렬
    if cur < as_date(start):
        cur += timedelta(days=7)
    while cur <= last:
        yield cur
        cur += timedelta(days=7)


def existing_dates(folder: str | Path, suffix: str = ".json") -> set[str]:
    """이미 수집된 날짜 파일(YYYY-MM-DD.<suffix>) 집합 — 증분 수집용."""
    folder = Path(folder)
    if not folder.exists():
        return set()
    return {p.stem for p in folder.glob(f"*{suffix}")}


def report_failures(failed: list, label: str) -> None:
    """최종 실패 목록 요약(무엇을 재실행으로 보완해야 하는지 보이게)."""
    if not failed:
        return
    shown = ", ".join(map(str, failed[:20])) + (" ..." if len(failed) > 20 else "")
    print(f"[{label}] 실패 {len(failed)}건: {shown}  → 같은 명령 재실행 시 자동 보완(증분)")


def progress(iterable: Iterable, desc: str = ""):
    """tqdm 있으면 진행률, 없으면 그대로 반환."""
    try:
        from tqdm import tqdm

        return tqdm(iterable, desc=desc)
    except Exception:
        return iterable
