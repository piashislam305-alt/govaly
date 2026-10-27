"""
Central configuration for the research image-collection pipeline.

Design principle: every policy that could cause an unlawful or unlicensed
download lives here, in one auditable place, and defaults to the *strictest*
setting. Nothing downstream may widen these values implicitly.
"""
from __future__ import annotations

import os
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
SCRIPTS_DIR = Path(__file__).resolve().parent
DATASET_ROOT = SCRIPTS_DIR.parent

RAW_DIR = DATASET_ROOT / "raw_images"
PROCESSED_DIR = DATASET_ROOT / "processed_images"
ANNOTATIONS_DIR = DATASET_ROOT / "annotations"
ANNOTATIONS_ORIGINAL_DIR = ANNOTATIONS_DIR / "original"
ANNOTATIONS_DERIVED_DIR = ANNOTATIONS_DIR / "derived"
METADATA_DIR = DATASET_ROOT / "metadata"
ASSESSMENTS_DIR = METADATA_DIR / "source_assessments"
DUPLICATE_DIR = DATASET_ROOT / "duplicate_images"
REJECTED_DIR = DATASET_ROOT / "rejected_images"
REPORTS_DIR = DATASET_ROOT / "reports"
SOURCES_DIR = SCRIPTS_DIR / "sources"

IMAGES_CSV = METADATA_DIR / "images.csv"
SOURCES_REGISTRY_CSV = METADATA_DIR / "sources_registry.csv"
SOURCES_REGISTRY_JSON = METADATA_DIR / "sources_registry.json"

# --------------------------------------------------------------------------- #
# Network / access policy  (see README "Access policy")
# --------------------------------------------------------------------------- #
USER_AGENT = (
    "GovalyResearchDatasetBot/1.0 "
    "(academic computer-vision dataset collection; contact: set CONTACT_EMAIL)"
)
CONTACT_EMAIL = os.environ.get("DATASET_CONTACT_EMAIL", "")

# Honour robots.txt. There is no supported way to disable this in this pipeline.
RESPECT_ROBOTS_TXT = True
ROBOTS_CACHE_TTL_SECONDS = 6 * 3600

# Politeness: minimum delay between requests to the same host, and a hard cap.
MIN_DELAY_SECONDS = float(os.environ.get("DATASET_MIN_DELAY", "1.0"))
MAX_CONCURRENT = 1                      # sequential by design; politeness first
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 2.0

# Payload guard-rails.
MAX_SINGLE_FILE_BYTES = 60 * 1024 * 1024        # 60 MiB per file
MAX_TOTAL_DOWNLOAD_BYTES = 2 * 1024**3          # 2 GiB per run unless raised
MAX_FILES_PER_SOURCE = int(os.environ.get("DATASET_MAX_FILES", "5000"))

# Only fetch from hosts explicitly declared in an *approved* source manifest.
# A URL that is not backed by an approved manifest entry is never fetched.
ALLOW_HTTP_FETCH = True


def _resolve_ca_bundle() -> str | bool:
    """
    Pick a CA bundle that actually validates TLS in this environment.

    Some sandboxes and corporate networks terminate TLS with a local CA that is
    present in the OS trust store but absent from certifi's bundle. We resolve
    the first bundle that exists rather than disabling verification - certificate
    checking is never turned off.
    """
    env = os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("CURL_CA_BUNDLE")
    candidates = [env] if env else []
    candidates += [
        "/etc/ssl/certs/ca-certificates.crt",     # Debian/Ubuntu
        "/etc/pki/tls/certs/ca-bundle.crt",       # RHEL/CentOS
        "/etc/ssl/ca-bundle.pem",                 # openSUSE
    ]
    try:
        import certifi
        candidates.append(certifi.where())
    except Exception:
        pass
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return True                                   # let the stdlib decide


CA_BUNDLE = _resolve_ca_bundle()

# --------------------------------------------------------------------------- #
# Rights policy
# --------------------------------------------------------------------------- #
# A source may only be downloaded when its manifest carries an affirmative
# rights determination. Anything else is skipped and reported.
REQUIRED_RIGHTS_STATUS = "approved"

# Licences we treat as granting academic research + ML-training use without a
# further, per-source signature. Everything else requires manual review.
PERMISSIVE_LICENSE_IDS = {
    "CC0", "CC0-1.0", "Public Domain", "Public Domain Mark 1.0",
    "CC-BY", "CC-BY-4.0", "CC-BY-SA", "CC-BY-SA-4.0",
    "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause",
    "Unlicense",
}

# Licences that permit research but forbid redistribution and/or commercial
# use. Downloadable, but the registry must record the restriction.
RESEARCH_ONLY_LICENSE_IDS = {
    "CC-BY-NC", "CC-BY-NC-4.0", "CC-BY-NC-SA", "CC-BY-NC-SA-4.0",
    "CC-BY-NC-ND", "CC-BY-NC-ND-4.0", "CC-BY-ND", "CC-BY-ND-4.0",
    "research-only", "custom-research-only", "gated-DUA",
}

# Content classes this pipeline will not collect under any licence, because
# collection itself creates legal exposure for the researcher (possession /
# redistribution of unlawful or non-consensual material) that no licence can
# cure. Recorded as hard exclusions, not as "awaiting permission".
HARD_EXCLUDED_CONTENT_CLASSES = frozenset({
    "adult-explicit-scrape",       # scraped from a commercial porn site
    "non-consensual-intimate-imagery",
    "csam-risk-unvetted-source",
})

# --------------------------------------------------------------------------- #
# Quality-control thresholds
# --------------------------------------------------------------------------- #
MIN_WIDTH = int(os.environ.get("DATASET_MIN_WIDTH", "64"))
MIN_HEIGHT = int(os.environ.get("DATASET_MIN_HEIGHT", "64"))
MIN_FILE_BYTES = 1024                       # below this: almost certainly junk

# Guard against decompression bombs. A tiny file can declare an enormous canvas
# and exhaust memory on decode, so the pixel budget is checked against the
# HEADER before any pixel data is read. Pillow's own default is 89,478,485 px.
MAX_IMAGE_PIXELS = int(os.environ.get("DATASET_MAX_PIXELS", str(89_478_485)))
ACCEPTED_FORMATS = {"JPEG", "PNG", "WEBP", "BMP", "GIF", "TIFF"}

# Blur detection: variance of the Laplacian. Threshold is intentionally
# configurable and is reported alongside every rejection so it is auditable.
BLUR_LAPVAR_THRESHOLD = float(os.environ.get("DATASET_BLUR_THRESHOLD", "40.0"))
BLUR_CHECK_MAX_SIDE = 512                   # downscale before Laplacian for speed

# Near-duplicate detection (perceptual hash, Hamming distance).
PHASH_NEAR_DUP_DISTANCE = int(os.environ.get("DATASET_PHASH_DISTANCE", "6"))

# A perceptual hash is only meaningful if the image has enough structure for the
# DCT to discriminate. Flat / solid-colour / near-uniform images all collapse onto
# the same handful of degenerate hashes (observed: 85 visually distinct fixtures
# sharing phash64=8000000000000000), which produces a combinatorial explosion of
# FALSE near-duplicate pairs. Images below these thresholds are excluded from
# near-duplicate pairing and flagged phash_reliable=false instead. They are still
# kept - a uniform image is a legitimate sample, it simply cannot be deduplicated
# by this method. Exact SHA-256 deduplication is unaffected and always applies.
PHASH_MIN_GREY_STD = float(os.environ.get("DATASET_PHASH_MIN_STD", "2.0"))
PHASH_MIN_GREY_ENTROPY_BITS = float(os.environ.get("DATASET_PHASH_MIN_ENTROPY", "2.5"))

# Processed-image normalisation (originals are never mutated).
PROCESSED_MAX_SIDE = int(os.environ.get("DATASET_PROCESSED_MAX_SIDE", "1024"))
PROCESSED_FORMAT = "JPEG"
PROCESSED_QUALITY = 92
