"""
Shared utilities: hashing, robots.txt handling, safe filenames, the metadata
CSV schema, and structured progress logging.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
import time
import urllib.parse
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import config

# --------------------------------------------------------------------------- #
# Metadata schema (column order is fixed; it is the contract of images.csv)
# --------------------------------------------------------------------------- #
CSV_COLUMNS = [
    "image_id",
    "original_filename",
    "local_filename",
    "source_name",
    "source_url",
    "author",
    "license",
    "license_url",
    "collection_date",
    "download_status",
    "image_width",
    "image_height",
    "file_size",
    "file_format",
    "sha256",
    "perceptual_hash",
    "annotation_status",
    "rights_review_status",
]

# Extra provenance columns written to a sidecar file so images.csv keeps the
# exact schema requested while nothing is lost.
SIDECAR_COLUMNS = [
    "image_id", "source_slug", "content_type", "http_status", "etag",
    "sha1", "md5", "phash64", "blur_lapvar", "quality_state",
    "rejection_reasons", "duplicate_of", "attempt_count", "bytes_downloaded",
    "rights_notes",
]

# --------------------------------------------------------------------------- #
# Time / ids
# --------------------------------------------------------------------------- #

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def new_image_id(slug: str, n: int) -> str:
    return f"{slug}-{n:06d}"


# --------------------------------------------------------------------------- #
# Hashing
# --------------------------------------------------------------------------- #

def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def multi_hash(data: bytes) -> dict[str, str]:
    return {
        "md5": hashlib.md5(data).hexdigest(),
        "sha1": hashlib.sha1(data).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def perceptual_hash(path_or_bytes, hash_size: int = 16) -> tuple[str, str] | None:
    """Return (phash_hex, phash64_hex) or None if the image cannot be decoded."""
    try:
        import io
        import imagehash
        from PIL import Image
    except Exception:
        return None
    try:
        if isinstance(path_or_bytes, (bytes, bytearray)):
            img = Image.open(io.BytesIO(path_or_bytes))
        else:
            img = Image.open(path_or_bytes)
        img = img.convert("RGB")
        return str(imagehash.phash(img, hash_size=hash_size)), \
               str(imagehash.phash(img, hash_size=8))
    except Exception:
        return None


def hamming(a: str, b: str) -> int:
    if len(a) != len(b):
        return 10**9
    x = int(a, 16) ^ int(b, 16)
    return bin(x).count("1")


# --------------------------------------------------------------------------- #
# Filenames
# --------------------------------------------------------------------------- #
_UNSAFE = re.compile(r"[^A-Za-z0-9._+-]+")


def safe_name(name: str, max_len: int = 120) -> str:
    """Preserve the original filename as far as it is safe to do so on disk."""
    name = urllib.parse.unquote(name or "").strip()
    name = name.replace("\x00", "")
    name = _UNSAFE.sub("_", name)
    name = name.lstrip(".")
    if len(name) > max_len:
        stem, dot, ext = name.rpartition(".")
        if dot and len(ext) <= 8:
            name = stem[: max_len - len(ext) - 1] + "." + ext
        else:
            name = name[:max_len]
    return name or "unnamed"


def unique_path(directory: Path, filename: str) -> Path:
    """Never overwrite. Collision -> name__1.ext, name__2.ext ..."""
    directory.mkdir(parents=True, exist_ok=True)
    candidate = directory / filename
    if not candidate.exists():
        return candidate
    stem, dot, ext = filename.rpartition(".")
    if not dot:
        stem, ext = filename, ""
    i = 1
    while True:
        candidate = directory / f"{stem}__{i}.{ext}" if ext else directory / f"{stem}__{i}"
        if not candidate.exists():
            return candidate
        i += 1


# --------------------------------------------------------------------------- #
# robots.txt  (REP-compliant matcher)
#
# We deliberately do NOT rely on urllib.robotparser for allow/deny decisions.
# Its parser percent-encodes the '*' wildcard in Disallow/Allow lines ('*' ->
# '%2A'), so wildcard rules such as "Disallow: /pypi/*/json" silently fail to
# match and the URL is wrongly reported as ALLOWED. That is an under-blocking
# bug, i.e. a compliance hole, so the matcher below implements the wildcards
# and precedence rules of the Robots Exclusion Protocol directly.
# --------------------------------------------------------------------------- #

class _Rule:
    __slots__ = ("pattern", "regex", "allow", "specificity")

    def __init__(self, pattern: str, allow: bool):
        self.pattern = pattern
        self.allow = allow
        # REP path patterns: '*' matches any sequence of characters,
        # a trailing '$' anchors the end of the URL path.
        body = pattern
        anchored = body.endswith("$")
        if anchored:
            body = body[:-1]
        # '*' matches any sequence of characters; segments are joined with '.*'.
        # A trailing '$' anchors the end of the path, otherwise the pattern
        # matches a prefix (standard REP behaviour).
        parts = [p for p in body.split("*")]
        expr = ".*".join(re.escape(part) for part in parts)
        self.regex = re.compile(expr + ("$" if anchored else ""))
        # Precedence: the most specific (longest) matching rule wins.
        self.specificity = len(pattern)

    def matches(self, path: str) -> bool:
        m = self.regex.match(path)
        return bool(m)


class _Group:
    __slots__ = ("agents", "rules", "crawl_delay")

    def __init__(self, agents: list[str]):
        self.agents = [a.strip().lower() for a in agents]
        self.rules: list[_Rule] = []
        self.crawl_delay: float | None = None

    def decision(self, path: str) -> tuple[bool, str]:
        best: _Rule | None = None
        for r in self.rules:
            if r.matches(path) and (best is None or r.specificity > best.specificity):
                best = r
        if best is None:
            return True, "no matching rule; allowed by default"
        verb = "Allow" if best.allow else "Disallow"
        return best.allow, f"{verb}: {best.pattern}"


def _parse_robots(text: str) -> list[_Group]:
    groups: list[_Group] = []
    current: _Group | None = None
    seen_agents: list[str] = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()
        if key == "user-agent":
            if current is not None and current.rules:
                current = None                      # new group begins
                seen_agents = []
            if current is None:
                current = _Group([])
                groups.append(current)
            current.agents.append(value.lower())
        elif key in ("disallow", "allow") and current is not None:
            if key == "disallow" and value == "":
                continue                            # "Disallow:" alone means allow all
            current.rules.append(_Rule(value, allow=(key == "allow")))
        elif key == "crawl-delay" and current is not None:
            try:
                current.crawl_delay = float(value)
            except ValueError:
                pass
    return groups


def _select_group(groups: list[_Group], user_agent: str) -> _Group:
    ua = user_agent.lower()
    specific = [g for g in groups if any(a and a != "*" and a in ua for a in g.agents)]
    if specific:
        return max(specific, key=lambda g: max((len(a) for a in g.agents), default=0))
    star = [g for g in groups if "*" in g.agents]
    return star[0] if star else _Group([])


_ROBOTS_CACHE: dict[str, tuple[float, list[_Group] | None]] = {}


def _fetch_robots(origin: str) -> list[_Group] | None:
    now = time.time()
    cached = _ROBOTS_CACHE.get(origin)
    if cached and now - cached[0] < config.ROBOTS_CACHE_TTL_SECONDS:
        return cached[1]
    groups: list[_Group] | None = None
    reason = ""
    try:
        import requests
        resp = requests.get(origin + "/robots.txt", timeout=config.REQUEST_TIMEOUT_SECONDS,
                            headers={"User-Agent": config.USER_AGENT},
                            verify=config.CA_BUNDLE)
        if resp.status_code in (401, 403):
            reason = f"robots.txt returned {resp.status_code}"
        elif resp.status_code == 404 or resp.status_code == 410:
            groups = []                             # no robots.txt == no restrictions
        elif resp.status_code >= 400:
            reason = f"robots.txt unreachable (HTTP {resp.status_code})"
        else:
            groups = _parse_robots(resp.text)
    except Exception as exc:                        # noqa: BLE001
        reason = f"robots.txt fetch error ({exc.__class__.__name__})"
    _ROBOTS_CACHE[origin] = (now, groups)
    if groups is None:
        log(f"{origin}: {reason}; failing closed", level="WARN")
    return groups


def robots_allows(url: str, user_agent: str = "*") -> tuple[bool, str]:
    """
    Returns (allowed, reason). FAILS CLOSED: if robots.txt cannot be read or
    parsed, the URL is treated as disallowed rather than assumed permitted.
    """
    if not config.RESPECT_ROBOTS_TXT:
        return True, "robots-check-disabled"
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False, f"non-HTTP URL scheme {parsed.scheme!r}; refusing"
    origin = f"{parsed.scheme}://{parsed.netloc}"
    groups = _fetch_robots(origin)
    if groups is None:
        return False, "robots.txt unavailable; failing closed"
    if not groups:
        return True, "no robots.txt published; allowed"
    group = _select_group(groups, user_agent)
    allowed, why = group.decision(parsed.path or "/")
    if parsed.query and allowed:
        # A query string can change what a path rule means; re-check the full
        # path?query form, which is what crawlers actually match against.
        allowed2, why2 = group.decision(f"{parsed.path}?{parsed.query}")
        if not allowed2:
            return False, f"{why2} (matched path?query)"
    return allowed, why


def robots_crawl_delay(url: str, user_agent: str = "*") -> float | None:
    parsed = urllib.parse.urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    groups = _ROBOTS_CACHE.get(origin, (0, None))[1]
    if not groups:
        return None
    return _select_group(groups, user_agent).crawl_delay


# --------------------------------------------------------------------------- #
# CSV / JSON IO
# --------------------------------------------------------------------------- #

def write_csv(path: Path, columns: list[str], rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({c: row.get(c, "") for c in columns})
            n += 1
    return n


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False, default=str),
                    encoding="utf-8")


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def append_jsonl(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(obj, ensure_ascii=False, default=str) + "\n")


# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #

def log(msg: str, *, level: str = "INFO") -> None:
    stamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{stamp}] {level:<5} {msg}", file=sys.stderr, flush=True)


def banner(title: str) -> None:
    bar = "=" * 78
    print(f"\n{bar}\n{title}\n{bar}", file=sys.stderr, flush=True)
