#!/usr/bin/env python3
"""
Stage 2 - Rights-gated image collection.

REFUSES to run for any source whose assessment is not "approved". Sources that
are approved but unreachable from this environment are skipped with a distinct
status so the legal position is never confused with a network limitation.

Supported access adapters
    github_contents_api   enumerate a repo directory, fetch blobs via the API
    github_tree_api       recursive git-tree listing filtered by path prefix
    pypi_wheel            extract images from a package wheel on PyPI
    http_file_list        explicit list of image URLs
    zip_archive           download an archive, extract matching members
    hf_gated_dataset      REFUSED - requires a human to accept a DUA
    author_request        REFUSED - requires correspondence with the authors
    documented_dataset_api generic JSON API (needs a resolver in the manifest)

Guarantees
    * robots.txt is consulted and fails CLOSED for http(s) fetches.
    * Original bytes are written unmodified; originals are never transcoded.
    * Original filenames are preserved (only characters unsafe on disk are
      substituted, and the original name is retained in metadata).
    * Files are never overwritten; collisions get a __N suffix.
    * Per-source exclusion lists are applied before any request is made.
    * Every attempt, success and failure is logged to a JSONL audit trail.
    * No authentication, paywall, CAPTCHA or access control is ever bypassed.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
import time
import zipfile
from pathlib import Path
from typing import Callable, Iterator
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common
import config

try:
    import requests
except ImportError:                                   # pragma: no cover
    print("requests is required: pip install requests", file=sys.stderr)
    raise

DOWNLOAD_LOG = config.METADATA_DIR / "download_log.jsonl"
RUN_ID = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
SHA_INDEX = config.METADATA_DIR / "sha256_index.json"
MANIFEST_INDEX = config.METADATA_DIR / "file_manifest.jsonl"

# Refused access methods: they cannot be satisfied without a human act that this
# pipeline will not perform on the researcher's behalf.
REFUSED_ACCESS_METHODS = {
    "hf_gated_dataset", "author_request", "scrape_against_tos",
    "auth_bypass", "paywall_bypass", "captcha_bypass",
}

IMAGE_MAGIC = {
    b"\xff\xd8\xff": "JPEG",
    b"\x89PNG\r\n\x1a\n": "PNG",
    b"GIF87a": "GIF", b"GIF89a": "GIF",
    b"BM": "BMP",
    b"II*\x00": "TIFF", b"MM\x00*": "TIFF",        # classic TIFF
    b"II+\x00": "TIFF", b"MM\x00+": "TIFF",        # BigTIFF
    b"RIFF": "WEBP?",          # confirmed below
}


def sniff_format(data: bytes) -> str | None:
    """Identify the true container from magic bytes, independent of any library."""
    if not data:
        return None
    for magic, fmt in IMAGE_MAGIC.items():
        if data.startswith(magic):
            if fmt == "WEBP?":
                return "WEBP" if data[8:12] == b"WEBP" else None
            return fmt
    if data[:4] in (b"\x00\x00\x01\x00",):
        return "ICO"
    if re.match(rb"P[1-6]\s", data[:3]):
        return "PPM"
    return None


# --------------------------------------------------------------------------- #
# FileRef: one candidate file, plus the callable that yields its bytes
# --------------------------------------------------------------------------- #
class FileRef:
    __slots__ = ("original_name", "rel_subdir", "size_hint", "fetch", "origin")

    def __init__(self, original_name: str, fetch: Callable[[], bytes],
                 rel_subdir: str = "", size_hint: int | None = None, origin: str = ""):
        self.original_name = original_name
        self.rel_subdir = rel_subdir
        self.size_hint = size_hint
        self.fetch = fetch
        self.origin = origin


# --------------------------------------------------------------------------- #
# HTTP session with politeness, retries and a hard size cap
# --------------------------------------------------------------------------- #
class Fetcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = config.CA_BUNDLE          # never disabled
        self.session.headers.update({"User-Agent": config.USER_AGENT})
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"
            self.session.headers["Accept"] = "application/vnd.github+json"
            self.authenticated = True
        else:
            self.authenticated = False
        self._last_host_time: dict[str, float] = {}
        self.bytes_downloaded = 0
        self.request_count = 0

    # -- politeness ------------------------------------------------------ #
    def _throttle(self, url: str, extra_delay: float = 0.0) -> None:
        host = urlparse(url).netloc
        delay = max(config.MIN_DELAY_SECONDS, extra_delay)
        last = self._last_host_time.get(host)
        if last is not None:
            wait = delay - (time.time() - last)
            if wait > 0:
                time.sleep(wait)
        self._last_host_time[host] = time.time()

    # -- core GET -------------------------------------------------------- #
    def get(self, url: str, *, stream: bool = False,
            respect_robots: bool = True) -> requests.Response:
        if respect_robots:
            allowed, reason = common.robots_allows(url)
            if not allowed:
                raise PermissionError(f"robots.txt: {reason}")
            crawl = common.robots_crawl_delay(url) or 0
        else:
            crawl = 0
        self._throttle(url, crawl)

        last_exc: Exception | None = None
        for attempt in range(1, config.MAX_RETRIES + 1):
            self.request_count += 1
            try:
                resp = self.session.get(url, timeout=config.REQUEST_TIMEOUT_SECONDS,
                                        stream=stream, allow_redirects=True)
                if resp.status_code in (403, 429):
                    reset = resp.headers.get("X-RateLimit-Reset")
                    if reset and reset.isdigit():
                        wait = max(0, int(reset) - int(time.time()))
                        if wait > 0 and attempt < config.MAX_RETRIES:
                            common.log(f"rate limited; sleeping {min(wait, 120)}s", level="WARN")
                            time.sleep(min(wait, 120))
                            continue
                    raise PermissionError(f"HTTP {resp.status_code} (access denied / rate limited)")
                if resp.status_code == 401:
                    raise PermissionError("HTTP 401 (authentication required - not bypassing)")
                if resp.status_code == 404:
                    raise FileNotFoundError("HTTP 404")
                if resp.status_code >= 500:
                    raise IOError(f"HTTP {resp.status_code} (server error)")
                resp.raise_for_status()
                return resp
            except (PermissionError, FileNotFoundError):
                raise
            except Exception as exc:                            # noqa: BLE001
                last_exc = exc
                if attempt < config.MAX_RETRIES:
                    time.sleep(config.RETRY_BACKOFF_SECONDS * attempt)
        raise IOError(f"failed after {config.MAX_RETRIES} attempts: {last_exc}")

    def get_bytes(self, url: str, *, respect_robots: bool = True) -> tuple[bytes, dict]:
        resp = self.get(url, stream=True, respect_robots=respect_robots)
        declared = resp.headers.get("Content-Length")
        if declared and int(declared) > config.MAX_SINGLE_FILE_BYTES:
            resp.close()
            raise ValueError(f"declared size {declared} exceeds cap {config.MAX_SINGLE_FILE_BYTES}")
        buf = io.BytesIO()
        with resp:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                buf.write(chunk)
                if buf.tell() > config.MAX_SINGLE_FILE_BYTES:
                    raise ValueError(f"stream exceeded cap {config.MAX_SINGLE_FILE_BYTES}")
                if self.bytes_downloaded + buf.tell() > config.MAX_TOTAL_DOWNLOAD_BYTES:
                    raise ValueError("per-run total download cap reached")
        data = buf.getvalue()
        self.bytes_downloaded += len(data)
        meta = {
            "http_status": resp.status_code,
            "content_type": resp.headers.get("Content-Type", ""),
            "etag": resp.headers.get("ETag", ""),
            "final_url": str(resp.url),
        }
        return data, meta

    def get_json(self, url: str, *, respect_robots: bool = True) -> dict | list:
        resp = self.get(url, respect_robots=respect_robots)
        with resp:
            return resp.json()


# --------------------------------------------------------------------------- #
# Adapters: each yields FileRefs for one approved source
# --------------------------------------------------------------------------- #
def _gh(fetcher: Fetcher, url: str) -> dict | list:
    # api.github.com publishes its own robots.txt; the API is the documented,
    # intended programmatic interface, so robots parsing is applied but the API
    # host is expected to allow it. Failing closed is still correct behaviour.
    return fetcher.get_json(url, respect_robots=True)


def _gh_blob(fetcher: Fetcher, repo: str, sha: str) -> Callable[[], bytes]:
    def _f() -> bytes:
        data = _gh(fetcher, f"https://api.github.com/repos/{repo}/git/blobs/{sha}")
        return base64.b64decode(data["content"])
    return _f


def _gh_contents_bytes(fetcher: Fetcher, repo: str, path: str, ref: str,
                       sha: str) -> Callable[[], bytes]:
    def _f() -> bytes:
        url = f"https://api.github.com/repos/{repo}/contents/{path}?ref={ref}"
        data = _gh(fetcher, url)
        if isinstance(data, dict) and data.get("content"):
            return base64.b64decode(data["content"])
        # >1 MiB: contents API omits the payload, fall back to the blob endpoint
        return _gh_blob(fetcher, repo, sha)()
    return _f


def adapter_github_contents_api(fetcher: Fetcher, ac: dict) -> Iterator[FileRef]:
    repo, path, ref = ac["repo"], ac["path"], ac.get("ref", "HEAD")
    exts = tuple(e.lower() for e in ac.get("image_extensions", []))
    listing = _gh(fetcher, f"https://api.github.com/repos/{repo}/contents/{path}?ref={ref}")
    for entry in listing:
        if entry.get("type") != "file":
            continue
        name = entry["name"]
        if exts and not name.lower().endswith(exts):
            continue
        if entry.get("size", 0) > config.MAX_SINGLE_FILE_BYTES:
            common.log(f"skipping oversized {name} ({entry.get('size')} B)", level="WARN")
            continue
        yield FileRef(
            original_name=name,
            fetch=_gh_contents_bytes(fetcher, repo, entry["path"], ref, entry["sha"]),
            size_hint=entry.get("size"),
            origin=f"https://github.com/{repo}/blob/{ref}/{entry['path']}",
        )


def adapter_github_tree_api(fetcher: Fetcher, ac: dict) -> Iterator[FileRef]:
    repo, prefix, ref = ac["repo"], ac["path_prefix"], ac.get("ref", "HEAD")
    exts = tuple(e.lower() for e in ac.get("image_extensions", []))
    cap = int(ac.get("max_files", config.MAX_FILES_PER_SOURCE))
    tree = _gh(fetcher, f"https://api.github.com/repos/{repo}/git/trees/{ref}?recursive=1")
    if tree.get("truncated"):
        common.log(f"{repo}: git tree listing was TRUNCATED - inventory may be incomplete",
                   level="WARN")
    n = 0
    for entry in tree.get("tree", []):
        if entry.get("type") != "blob" or not entry["path"].startswith(prefix):
            continue
        name = entry["path"].split("/")[-1]
        if exts and not name.lower().endswith(exts):
            continue
        if entry.get("size", 0) > config.MAX_SINGLE_FILE_BYTES:
            continue
        n += 1
        if n > cap:
            common.log(f"{repo}: hit max_files={cap}; stopping enumeration", level="WARN")
            return
        rel = entry["path"][len(prefix):]
        subdir = str(Path(rel).parent) if "/" in rel else ""
        yield FileRef(
            original_name=name,
            rel_subdir="" if subdir == "." else subdir,
            fetch=_gh_blob(fetcher, repo, entry["sha"]),
            size_hint=entry.get("size"),
            origin=f"https://github.com/{repo}/blob/{ref}/{entry['path']}",
        )


def adapter_pypi_wheel(fetcher: Fetcher, ac: dict) -> Iterator[FileRef]:
    dist = ac["distribution"]
    prefix = ac.get("path_prefix", "")
    info = fetcher.get_json(f"https://pypi.org/pypi/{dist}/json", respect_robots=True)
    urls = info["urls"]
    wheels = [u for u in urls if u["packagetype"] == "bdist_wheel"
              and ("py3-none-any" in u["filename"] or "manylinux" in u["filename"]
                   or "cp311" in u["filename"])]
    pick = wheels[0] if wheels else urls[0]
    common.log(f"PyPI wheel: {pick['filename']} ({pick['size']:,} B)")
    data, _ = fetcher.get_bytes(pick["url"], respect_robots=True)
    zf = zipfile.ZipFile(io.BytesIO(data))
    exts = tuple(e.lower() for e in ac.get("image_extensions",
                                           [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp", ".bmp"]))
    for member in zf.infolist():
        if member.is_dir() or not member.filename.lower().endswith(exts):
            continue
        if prefix and not member.filename.startswith(prefix):
            continue
        payload = zf.read(member.filename)

        def _f(p=payload) -> bytes:
            return p
        rel = member.filename[len(prefix):]
        subdir = str(Path(rel).parent)
        yield FileRef(
            original_name=Path(rel).name,
            rel_subdir="" if subdir == "." else subdir,
            fetch=_f,
            size_hint=member.file_size,
            origin=f"pypi://{dist}/{member.filename}",
        )


def adapter_http_file_list(fetcher: Fetcher, ac: dict) -> Iterator[FileRef]:
    for url in ac.get("urls", []):
        name = Path(urlparse(url).path).name
        yield FileRef(original_name=name,
                      fetch=lambda u=url: fetcher.get_bytes(u)[0],
                      origin=url)


def adapter_zip_archive(fetcher: Fetcher, ac: dict) -> Iterator[FileRef]:
    url = ac["url"]
    pattern = re.compile(ac.get("inner_pattern", r"\.(jpe?g|png|webp|bmp|tiff?)$"), re.I)
    data, _ = fetcher.get_bytes(url)
    zf = zipfile.ZipFile(io.BytesIO(data))
    for member in zf.infolist():
        if member.is_dir() or not pattern.search(member.filename):
            continue
        payload = zf.read(member.filename)
        yield FileRef(original_name=Path(member.filename).name,
                      rel_subdir=str(Path(member.filename).parent),
                      fetch=lambda p=payload: p,
                      size_hint=member.file_size,
                      origin=f"{url}!{member.filename}")


ADAPTERS: dict[str, Callable[[Fetcher, dict], Iterator[FileRef]]] = {
    "github_contents_api": adapter_github_contents_api,
    "github_tree_api": adapter_github_tree_api,
    "pypi_wheel": adapter_pypi_wheel,
    "http_file_list": adapter_http_file_list,
    "zip_archive": adapter_zip_archive,
}


# --------------------------------------------------------------------------- #
# Collection of one source
# --------------------------------------------------------------------------- #
def collect_source(assessment: dict, fetcher: Fetcher, *, limit: int | None,
                   dry_run: bool, sha_index: dict) -> dict:
    slug = assessment["slug"]
    method = assessment["access_method"]
    stats = {
        "slug": slug, "rights_review_status": assessment["rights_review_status"],
        "discovered": 0, "excluded_by_rights": 0, "excluded_by_manifest": 0,
        "downloaded": 0, "skipped_already_present": 0, "failed": 0,
        "bytes": 0, "formats": {},
    }

    # ---- GATE 1: rights ------------------------------------------------ #
    if assessment["rights_review_status"] != config.REQUIRED_RIGHTS_STATUS:
        stats["excluded_by_rights"] = 1
        common.log(f"[{slug}] SKIPPED - rights_review_status="
                   f"{assessment['rights_review_status']!r} (need {config.REQUIRED_RIGHTS_STATUS!r})",
                   level="WARN")
        return stats
    if method in REFUSED_ACCESS_METHODS:
        stats["excluded_by_rights"] = 1
        common.log(f"[{slug}] SKIPPED - access_method={method!r} requires a human act "
                   f"this pipeline will not perform", level="WARN")
        return stats

    # ---- GATE 2: reachability ------------------------------------------ #
    if not assessment.get("environment_reachable", True):
        stats["excluded_by_rights"] = 1
        common.log(f"[{slug}] SKIPPED - approved but not reachable from this environment; "
                   f"run on your own network", level="WARN")
        return stats

    adapter = ADAPTERS.get(method)
    if adapter is None:
        common.log(f"[{slug}] no adapter for access_method={method!r}", level="ERROR")
        stats["failed"] += 1
        return stats

    excluded_files = {f.lower() for f in assessment.get("exclusions", {}).get("files", [])}
    exclusion_reason = assessment.get("exclusions", {}).get("reason", "")
    dest_root = config.RAW_DIR / slug
    common.log(f"[{slug}] enumerating via {method} -> {dest_root}")

    for ref in adapter(fetcher, assessment.get("access_config", {})):
        stats["discovered"] += 1
        common.append_jsonl(MANIFEST_INDEX, {
            "run_id": RUN_ID,
            "slug": slug, "original_filename": ref.original_name,
            "rel_subdir": ref.rel_subdir, "size_hint": ref.size_hint,
            "origin": ref.origin, "enumerated_at": common.utcnow_iso(),
        })

        # ---- GATE 3: per-source consent/provenance exclusions ---------- #
        if ref.original_name.lower() in excluded_files:
            stats["excluded_by_manifest"] += 1
            common.append_jsonl(DOWNLOAD_LOG, {
                "slug": slug, "original_filename": ref.original_name,
"run_id": RUN_ID,                 "download_status": "excluded_by_source_manifest",
                "reason": exclusion_reason, "at": common.utcnow_iso(),
            })
            common.log(f"[{slug}] excluded {ref.original_name} (consent/provenance)", level="WARN")
            continue

        if dry_run:
            continue
        if limit is not None and stats["downloaded"] >= limit:
            common.log(f"[{slug}] reached --limit {limit}; stopping", level="WARN")
            break

        try:
            data = ref.fetch()
        except Exception as exc:                                # noqa: BLE001
            stats["failed"] += 1
            common.append_jsonl(DOWNLOAD_LOG, {
                "slug": slug, "original_filename": ref.original_name,
"run_id": RUN_ID,                 "download_status": "failed", "error": f"{exc.__class__.__name__}: {exc}",
                "origin": ref.origin, "at": common.utcnow_iso(),
            })
            common.log(f"[{slug}] FAILED {ref.original_name}: {exc}", level="ERROR")
            continue

        digest = common.sha256_bytes(data)

        # ---- GATE 4: do not re-collect identical bytes ------------------ #
        if digest in sha_index:
            stats["skipped_already_present"] += 1
            common.append_jsonl(DOWNLOAD_LOG, {
                "slug": slug, "original_filename": ref.original_name,
"run_id": RUN_ID,                 "download_status": "skipped_already_present", "sha256": digest,
                "existing_image_id": sha_index[digest], "origin": ref.origin,
                "at": common.utcnow_iso(),
            })
            continue

        fmt = sniff_format(data)
        subdir = dest_root / ref.rel_subdir if ref.rel_subdir else dest_root
        target = common.unique_path(subdir, common.safe_name(ref.original_name))
        target.write_bytes(data)

        sha_index[digest] = f"{slug}/{target.name}"
        stats["downloaded"] += 1
        stats["bytes"] += len(data)
        fetcher.bytes_downloaded += len(data)
        stats["formats"][fmt or "UNKNOWN"] = stats["formats"].get(fmt or "UNKNOWN", 0) + 1

        common.append_jsonl(DOWNLOAD_LOG, {
            "slug": slug, "original_filename": ref.original_name,
            "local_filename": str(target.relative_to(config.DATASET_ROOT)),
"run_id": RUN_ID,             "download_status": "success" if fmt else "success_unverified_format",
            "sniffed_format": fmt, "sha256": digest, "file_size": len(data),
            "origin": ref.origin, "at": common.utcnow_iso(),
        })
        if stats["downloaded"] % 50 == 0:
            common.log(f"[{slug}] {stats['downloaded']} downloaded "
                       f"({stats['bytes'] / 1e6:.1f} MB)")

    common.log(f"[{slug}] done: discovered={stats['discovered']} "
               f"downloaded={stats['downloaded']} excluded={stats['excluded_by_manifest']} "
               f"failed={stats['failed']}")
    return stats


# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", action="append", help="limit to these source slugs")
    ap.add_argument("--limit", type=int, default=None, help="max files per source")
    ap.add_argument("--dry-run", action="store_true", help="enumerate only, fetch nothing")
    ap.add_argument("--allow-unreachable", action="store_true",
                    help="attempt approved sources marked unreachable (for use on your own network)")
    args = ap.parse_args()

    common.banner("STAGE 2 - RIGHTS-GATED COLLECTION")
    registry = common.read_json(config.SOURCES_REGISTRY_JSON)
    if not registry:
        common.log("No registry found. Run assess_source.py first.", level="ERROR")
        return 1

    sources = registry["sources"]
    if args.slug:
        sources = [s for s in sources if s["slug"] in set(args.slug)]
    if args.allow_unreachable:
        for s in sources:
            s["environment_reachable"] = True

    approved = [s for s in sources if s["rights_review_status"] == config.REQUIRED_RIGHTS_STATUS]
    common.log(f"{len(sources)} sources in scope; {len(approved)} carry status "
               f"'{config.REQUIRED_RIGHTS_STATUS}'")
    for s in sources:
        if s["rights_review_status"] != config.REQUIRED_RIGHTS_STATUS:
            common.log(f"  NOT COLLECTING {s['slug']:<30} status={s['rights_review_status']}",
                       level="WARN")
    if args.dry_run:
        common.log("DRY RUN - no files will be written", level="WARN")

    # The enumeration manifest describes THIS run. Resetting it keeps the
    # discovered-file count honest even when a dry run precedes a real one.
    # download_log.jsonl is intentionally left append-only: it is an audit trail.
    if MANIFEST_INDEX.exists():
        MANIFEST_INDEX.unlink()

    fetcher = Fetcher()
    common.log(f"github api authenticated={fetcher.authenticated}")
    common.log(f"run_id={RUN_ID}")
    sha_index: dict = common.read_json(SHA_INDEX, {}) or {}

    all_stats = []
    for s in approved:
        all_stats.append(collect_source(s, fetcher, limit=args.limit,
                                        dry_run=args.dry_run, sha_index=sha_index))

    if not args.dry_run:
        common.write_json(SHA_INDEX, sha_index)

    common.write_json(config.METADATA_DIR / "collect_stats.json", {
        "generated_at": common.utcnow_iso(),
        "run_id": RUN_ID,
        "dry_run": args.dry_run,
        "authenticated_github_api": fetcher.authenticated,
        "http_requests_issued": fetcher.request_count,
        "bytes_downloaded": fetcher.bytes_downloaded,
        "sources": all_stats,
    })

    common.banner("COLLECTION SUMMARY")
    tot = lambda k: sum(s[k] for s in all_stats)             # noqa: E731
    print(f" Sources in scope ................ {len(sources)}")
    print(f" Sources with approved rights .... {len(approved)}")
    print(f" Files discovered (enumerated) ... {tot('discovered'):,}")
    print(f" Files downloaded ................ {tot('downloaded'):,}")
    print(f" Excluded by consent/provenance .. {tot('excluded_by_manifest'):,}")
    print(f" Skipped (bytes already held) .... {tot('skipped_already_present'):,}")
    print(f" Failed .......................... {tot('failed'):,}")
    print(f" Bytes written ................... {tot('bytes') / 1e6:.2f} MB")
    print(f" HTTP requests issued ............ {fetcher.request_count:,}")
    print(f"\n Audit trail -> {DOWNLOAD_LOG.relative_to(config.DATASET_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
