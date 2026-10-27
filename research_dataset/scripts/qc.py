#!/usr/bin/env python3
"""
Stage 3 - Image quality control and duplicate detection.

Checks, in order (each independently recorded so an image can fail several):
    1. decodable          - PIL can open AND fully load the file
    2. supported_format   - container is in ACCEPTED_FORMATS and magic bytes agree
    3. min_file_size      - >= MIN_FILE_BYTES
    4. min_resolution     - width >= MIN_WIDTH and height >= MIN_HEIGHT
    5. blur               - variance of the Laplacian >= BLUR_LAPVAR_THRESHOLD
    6. exact_duplicate    - SHA-256 already seen (first occurrence is canonical)
    7. near_duplicate     - perceptual-hash Hamming distance <= PHASH_NEAR_DUP_DISTANCE

Routing (ORIGINALS ARE NEVER DELETED, MOVED OR MODIFIED):
    pass                -> processed_images/<slug>/  (a normalised COPY)
    any hard failure    -> rejected_images/<reason>/ (a COPY + reason)
    EXACT duplicate     -> duplicate_images/<slug>/  (a COPY, canonical kept in raw)
    NEAR duplicate only -> KEPT in processed_images/, flagged + queued for review

Why near-duplicates are not auto-routed: a pHash collision does not prove
redundancy. In this corpus the near-duplicate groups are legitimate distinct
samples - Pillow ships the same picture in many containers (hopper.bmp/.gif/
.jpg/.png) precisely to exercise each decoder, and OpenCV's left11/left14 are
two different frames of a stereo calibration set. Removing them automatically
would destroy valid data. Only byte-identical files (SHA-256), which provably
carry zero additional information, are routed out without human review.

Near-duplicate candidate generation uses LSH banding over the 64-bit pHash
(four 16-bit bands) so the comparison cost stays sub-quadratic as the corpus
grows; candidates are then confirmed by exact Hamming distance.
"""
from __future__ import annotations

import argparse
import collections
import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common
import config

try:
    import cv2
    import numpy as np
    from PIL import Image, ImageFile
except ImportError:                                   # pragma: no cover
    print("requires: pip install pillow numpy opencv-python-headless", file=sys.stderr)
    raise

# Truncated files are a real-world condition we must DETECT and reject, not
# silently repair - so strict mode stays on for the decode check.
ImageFile.LOAD_TRUNCATED_IMAGES = False

QC_RECORDS = config.METADATA_DIR / "qc_records.jsonl"
REJECTED_MANIFEST = config.METADATA_DIR / "rejected_manifest.csv"
DUPLICATE_REPORT_JSON = config.REPORTS_DIR / "duplicate_report.json"

REJECT_DIRS = {
    "corrupt": "corrupt",
    "qc_error": "qc_error",
    "excessive_pixels": "excessive_pixels",
    "unsupported_format": "unsupported_format",
    "too_small_file": "too_small_file",
    "low_resolution": "low_resolution",
    "blurry": "blurry",
}


# --------------------------------------------------------------------------- #
# Individual checks
# --------------------------------------------------------------------------- #
def check_decode(path: Path) -> tuple[Image.Image | None, list[str]]:
    """
    Open and fully decode an image.

    The declared pixel count is checked against MAX_IMAGE_PIXELS from the header
    BEFORE any pixel data is read. This matters because the corpus contains
    untrusted third-party files: a few-kilobyte file can declare a multi-
    gigapixel canvas and exhaust memory on decode (a decompression bomb).
    """
    try:
        img = Image.open(path)
    except Image.DecompressionBombError as exc:
        # Pillow raises this during open() once the declared canvas exceeds
        # 2x MAX_IMAGE_PIXELS. Classify it correctly rather than as generic
        # corruption - the file may be perfectly well-formed, just enormous.
        return None, [f"excessive_pixels:{str(exc)[:160]} (rejected from header without decoding)"]
    except Exception as exc:             # noqa: BLE001
        return None, [f"corrupt:{exc.__class__.__name__}: {str(exc)[:160]}"]

    try:
        w, h = img.size
    except Exception:                    # noqa: BLE001
        w = h = 0
    if w and h and w * h > config.MAX_IMAGE_PIXELS:
        img.close()
        return None, [f"excessive_pixels:{w}x{h}={w * h:,}>{config.MAX_IMAGE_PIXELS:,} "
                      f"(rejected from header without decoding)"]

    try:
        img.load()                       # forces full decode
        return img, []
    except Exception as exc:             # noqa: BLE001
        try:
            img.close()
        except Exception:                # noqa: BLE001
            pass
        return None, [f"corrupt:{exc.__class__.__name__}: {str(exc)[:160]}"]


def check_format(path: Path, img: Image.Image | None) -> tuple[str, list[str]]:
    """Cross-check the declared container against the magic bytes."""
    reasons = []
    with path.open("rb") as fh:
        head = fh.read(16)
    from collect import sniff_format
    sniffed = sniff_format(head)
    declared = (img.format if img else None)
    if declared and declared.upper() not in config.ACCEPTED_FORMATS:
        reasons.append(f"unsupported_format:{declared}")
    if sniffed is None:
        reasons.append("unsupported_format:unrecognised magic bytes")
    elif declared and sniffed.rstrip("?").upper() != declared.upper():
        # A mismatch usually means a mislabelled or truncated container.
        reasons.append(f"format_mismatch:declared={declared} magic={sniffed}")
    return (declared or sniffed or "UNKNOWN"), reasons


def laplacian_variance(img: Image.Image, side: int = config.BLUR_CHECK_MAX_SIDE) -> float:
    """
    Blur score = variance of the Laplacian on a greyscale copy resampled to a
    CANONICAL long edge.

    Resampling in both directions (up as well as down) is what makes the score
    comparable across images of different native resolutions: measuring a 256px
    image at 256px and a 4000px image at 512px would otherwise compare two
    different frequency bands and penalise high-resolution images arbitrarily.

    Caveat that must be carried into any write-up: Laplacian variance is still
    content-dependent. A genuinely sharp image of a smooth, low-texture subject
    scores low; a noisy or heavily compressed image can score high. It is a
    triage heuristic, not a ground-truth image-quality label.
    """
    g = to_greyscale(img)
    if g is None:
        return 0.0
    w, h = g.size
    if max(w, h) == 0:
        return 0.0
    scale = side / max(w, h)
    if abs(scale - 1.0) > 1e-6:
        g = g.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.BILINEAR)
    arr = np.asarray(g, dtype=np.float64)
    if arr.size < 9:
        return 0.0
    lap = cv2.Laplacian(arr, cv2.CV_64F)
    return float(lap.var())


def to_greyscale(img: Image.Image) -> Image.Image | None:
    """
    Convert any Pillow mode to single-channel greyscale, defensively.

    `Image.convert("L")` raises for several real-world modes that appear in
    untrusted corpora - notably LAB ("conversion from LAB to L not supported"),
    and some 16-bit / multi-band TIFFs. Falling back to the first channel is
    correct for LAB (channel 0 IS luminance) and merely approximate elsewhere,
    which is acceptable for a triage heuristic. Returns None if no conversion
    is possible at all.
    """
    if img.mode == "L":
        return img
    try:
        return img.convert("L")
    except Exception:                                     # noqa: BLE001
        pass
    try:
        if len(img.getbands()) >= 1:
            return img.getchannel(0)
    except Exception:                                     # noqa: BLE001
        pass
    try:
        return img.convert("RGB").convert("L")
    except Exception:                                     # noqa: BLE001
        return None


def phash_is_reliable(img: Image.Image) -> tuple[bool, float, float]:
    """
    Decide whether a perceptual hash of this image can carry information.

    Returns (reliable, greyscale_std, greyscale_entropy_bits). A flat or
    near-uniform image has a degenerate DCT: its pHash is dominated by the DC
    term and collides with every other flat image, so near-duplicate decisions
    based on it are meaningless.
    """
    grey = to_greyscale(img)
    if grey is None:
        return False, 0.0, 0.0
    g = np.asarray(grey, dtype=np.float64)
    if g.size == 0:
        return False, 0.0, 0.0
    std = float(g.std())
    hist, _ = np.histogram(g, bins=256, range=(0, 256))
    probs = hist / hist.sum()
    probs = probs[probs > 0]
    entropy = float(-(probs * np.log2(probs)).sum())
    ok = (std >= config.PHASH_MIN_GREY_STD
          and entropy >= config.PHASH_MIN_GREY_ENTROPY_BITS)
    return ok, std, entropy


def phash_bands(h64: str, bands: int = 4) -> list[tuple[int, str]]:
    v = int(h64, 16)
    width = 64 // bands
    mask = (1 << width) - 1
    return [(i, format((v >> (width * i)) & mask, f"0{width // 4}x")) for i in range(bands)]


# --------------------------------------------------------------------------- #
# Main pass
# --------------------------------------------------------------------------- #
def clear_derived_outputs() -> None:
    """
    Empty the DERIVED output directories so a re-run reproduces them exactly
    instead of accumulating __1/__2 copies alongside the previous run's output.

    Only derived artefacts are cleared: processed_images/, rejected_images/ and
    duplicate_images/. raw_images/ is NEVER touched - those are the byte-exact
    originals and the whole point of keeping rejected/duplicate copies rather
    than deleting anything. Everything cleared here is regenerable from
    raw_images/ by re-running this stage.
    """
    removed = 0
    for root in (config.PROCESSED_DIR, config.REJECTED_DIR, config.DUPLICATE_DIR):
        if not root.exists():
            continue
        for child in sorted(root.iterdir()):
            if child.is_dir():
                import shutil
                shutil.rmtree(child)
            else:
                child.unlink()
            removed += 1
    common.log(f"cleared {removed} previous derived output entries "
               f"(raw_images/ untouched)")


def run(limit: int | None = None, skip_blur: bool = False,
        keep_existing: bool = False) -> dict:
    common.banner("STAGE 3 - QUALITY CONTROL & DUPLICATE DETECTION")
    if not keep_existing:
        clear_derived_outputs()

    registry = common.read_json(config.SOURCES_REGISTRY_JSON, {"sources": []})
    rights_by_slug = {s["slug"]: s["rights_review_status"] for s in registry["sources"]}

    files = sorted(p for p in config.RAW_DIR.rglob("*") if p.is_file())
    if limit:
        files = files[:limit]
    common.log(f"{len(files)} raw files to inspect")

    seen_sha: dict[str, str] = {}
    bands_index: dict[tuple[int, str], list[int]] = collections.defaultdict(list)
    hashes: list[str] = []          # hashes[i] is the 64-bit pHash of record i
    hash_to_id: list[str] = []      # hash_to_id[i] is that record's image_id
    records: list[dict] = []
    rejected_rows: list[dict] = []

    stats = collections.Counter()
    widths, heights, sizes, blur_scores = [], [], [], []
    format_counts = collections.Counter()
    reject_reason_counts = collections.Counter()
    dup_groups: dict[str, list[str]] = collections.defaultdict(list)
    near_dup_pairs: list[dict] = []

    for i, path in enumerate(files, 1):
        try:
            slug = path.relative_to(config.RAW_DIR).parts[0] if len(
                path.relative_to(config.RAW_DIR).parts) > 1 else "_unsorted"
            image_id = f"{slug}-{i:06d}"
            reasons: list[str] = []      # failures -> rejection / duplicate routing
            flags: list[str] = []        # informational -> never rejects an image
            rec: dict[str, object] = {
                "image_id": image_id, "slug": slug,
                "original_filename": path.name,
                "raw_path": str(path.relative_to(config.DATASET_ROOT)),
                "file_size": path.stat().st_size,
                "rights_review_status": rights_by_slug.get(slug, "unknown"),
            }

            data = path.read_bytes()
            digest = common.sha256_bytes(data)
            rec["sha256"] = digest

            # -- 1/2. decode + format --------------------------------------- #
            img, dec_reasons = check_decode(path)
            reasons += dec_reasons
            fmt, fmt_reasons = check_format(path, img)
            reasons += fmt_reasons
            rec["file_format"] = fmt

            if img is not None:
                w, h = img.size
                rec["image_width"], rec["image_height"] = w, h
                widths.append(w); heights.append(h)
                format_counts[fmt] += 1

                # -- 3. file size ------------------------------------------- #
                if rec["file_size"] < config.MIN_FILE_BYTES:
                    reasons.append(f"too_small_file:{rec['file_size']}<{config.MIN_FILE_BYTES}")
                # -- 4. resolution ------------------------------------------ #
                if w < config.MIN_WIDTH or h < config.MIN_HEIGHT:
                    reasons.append(f"low_resolution:{w}x{h}<{config.MIN_WIDTH}x{config.MIN_HEIGHT}")
                # -- 5. blur ------------------------------------------------- #
                if skip_blur:
                    rec["blur_lapvar"] = None
                else:
                    try:
                        lv = laplacian_variance(img)
                    except Exception:                            # noqa: BLE001
                        lv = 0.0
                    rec["blur_lapvar"] = round(lv, 3)
                    blur_scores.append(lv)
                    if lv < config.BLUR_LAPVAR_THRESHOLD:
                        reasons.append(f"blurry:lapvar={lv:.2f}<{config.BLUR_LAPVAR_THRESHOLD}")

            sizes.append(rec["file_size"])

            # -- 6. exact duplicates ---------------------------------------- #
            canonical = seen_sha.get(digest)
            rec["duplicate_of"] = ""
            if canonical:
                reasons.append(f"exact_duplicate:sha256 matches {canonical}")
                rec["duplicate_of"] = canonical
                dup_groups[canonical].append(str(path.relative_to(config.DATASET_ROOT)))
                stats["exact_duplicates"] += 1
            else:
                seen_sha[digest] = image_id

            # -- perceptual hash + near duplicates --------------------------- #
            rec["perceptual_hash"] = ""
            rec["phash64"] = ""
            rec["phash_reliable"] = False
            if img is not None:
                reliable, gstd, gent = phash_is_reliable(img)
                rec["grey_std"] = round(gstd, 3)
                rec["grey_entropy_bits"] = round(gent, 3)
                rec["phash_reliable"] = reliable
                ph = common.perceptual_hash(path)
                if ph:
                    rec["perceptual_hash"], h64 = ph
                    rec["phash64"] = h64
                    if not reliable:
                        # Hash is recorded for provenance but deliberately NOT entered
                        # into the near-duplicate index: it cannot discriminate.
                        flags.append(f"phash_unreliable:flat/low-structure image "
                                     f"(grey_std={gstd:.2f}, entropy={gent:.2f} bits) - "
                                     f"excluded from near-duplicate pairing")
                        stats["phash_unreliable"] += 1
                    else:
                        idx = len(hashes)
                        hashes.append(h64)
                        hash_to_id.append(image_id)

                        # LSH candidate generation, then exact Hamming confirmation.
                        # Only PREVIOUS records are indexed, so each pair is seen once.
                        near: dict[int, int] = {}
                        for band in phash_bands(h64):
                            for other in bands_index[band]:
                                if other in near:
                                    continue
                                d = common.hamming(h64, hashes[other])
                                if d <= config.PHASH_NEAR_DUP_DISTANCE:
                                    near[other] = d
                        for band in phash_bands(h64):
                            bands_index[band].append(idx)

                        for other, d in sorted(near.items(), key=lambda t: t[1]):
                            oid = hash_to_id[other]
                            near_dup_pairs.append({
                                "image_id": image_id, "duplicate_of": oid, "hamming_distance": d,
                                "phash64": h64, "phash64_of": hashes[other],
                            })
                            reasons.append(f"near_duplicate:hamming={d} vs {oid}")
                            rec["duplicate_of"] = rec["duplicate_of"] or oid

            # -- classify ---------------------------------------------------- #
            hard = [r for r in reasons if r.split(":")[0] in REJECT_DIRS]
            is_exact = any(r.startswith("exact_duplicate") for r in reasons)
            is_near = any(r.startswith("near_duplicate") for r in reasons)
            rec["rejection_reasons"] = reasons
            rec["flags"] = flags
            rec["is_exact_duplicate"] = is_exact
            rec["is_near_duplicate"] = is_near
            # Hard failures and byte-identical duplicates are routed out.
            # Near-duplicates are KEPT and flagged - see the module docstring.
            rec["quality_state"] = ("rejected" if hard else
                                    "duplicate" if is_exact else
                                    "pass" if not reasons else "flagged")

            if not reasons:
                stats["passed"] += 1
                dest = config.PROCESSED_DIR / slug
                dest.mkdir(parents=True, exist_ok=True)
                out = _normalise(img, dest, path.name)
                rec["processed_path"] = str(out.relative_to(config.DATASET_ROOT)) if out else ""
            elif hard:
                stats["rejected"] += 1
                primary = hard[0].split(":")[0]
                reject_reason_counts[primary] += 1
                dest = config.REJECTED_DIR / REJECT_DIRS[primary] / slug
                dest.mkdir(parents=True, exist_ok=True)
                copy = common.unique_path(dest, path.name)
                copy.write_bytes(data)
                rec["rejected_path"] = str(copy.relative_to(config.DATASET_ROOT))
                rejected_rows.append({
                    "image_id": image_id, "slug": slug, "original_filename": path.name,
                    "primary_reason": primary, "all_reasons": " | ".join(reasons),
                    "file_format": fmt,
                    "image_width": rec.get("image_width", ""),
                    "image_height": rec.get("image_height", ""),
                    "file_size": rec["file_size"],
                    "moved_to": str(copy.relative_to(config.DATASET_ROOT)),
                })
            elif is_exact:
                stats["duplicates"] += 1
                dest = config.DUPLICATE_DIR / slug
                dest.mkdir(parents=True, exist_ok=True)
                copy = common.unique_path(dest, path.name)
                copy.write_bytes(data)
                rec["duplicate_path"] = str(copy.relative_to(config.DATASET_ROOT))
            else:
                stats["flagged"] += 1
                dest = config.PROCESSED_DIR / slug
                dest.mkdir(parents=True, exist_ok=True)
                out = _normalise(img, dest, path.name)
                rec["processed_path"] = str(out.relative_to(config.DATASET_ROOT)) if out else ""

            records.append(rec)
            common.append_jsonl(QC_RECORDS, rec)
            if i % 100 == 0:
                common.log(f"  {i}/{len(files)} inspected "
                           f"(pass={stats['passed']} reject={stats['rejected']} dup={stats['duplicates']})")
        except Exception as exc:
            # One pathological file must never abort a multi-thousand-file run.
            # Record it as a rejection with the error preserved, then continue.
            stats["rejected"] += 1
            reject_reason_counts["qc_error"] += 1
            rec = {
                "image_id": image_id, "slug": slug, "original_filename": path.name,
                "raw_path": str(path.relative_to(config.DATASET_ROOT)),
                "file_size": path.stat().st_size, "sha256": "",
                "rejection_reasons": [f"qc_error:{exc.__class__.__name__}: {str(exc)[:200]}"],
                "flags": [], "quality_state": "rejected", "file_format": "UNKNOWN",
            }
            try:
                dest = config.REJECTED_DIR / "qc_error" / slug
                dest.mkdir(parents=True, exist_ok=True)
                copy = common.unique_path(dest, path.name)
                copy.write_bytes(path.read_bytes())
                rec["rejected_path"] = str(copy.relative_to(config.DATASET_ROOT))
            except Exception:                                     # noqa: BLE001
                pass
            records.append(rec)
            common.append_jsonl(QC_RECORDS, rec)
            rejected_rows.append({
                "image_id": image_id, "slug": slug, "original_filename": path.name,
                "primary_reason": "qc_error",
                "all_reasons": rec["rejection_reasons"][0], "file_format": "UNKNOWN",
                "image_width": "", "image_height": "", "file_size": rec["file_size"],
                "moved_to": rec.get("rejected_path", ""),
            })
            common.log(f"  QC error on {path.name}: {exc.__class__.__name__}: {exc}", level="ERROR")

    # ---- reports -------------------------------------------------------- #
    common.write_csv(REJECTED_MANIFEST,
                     ["image_id", "slug", "original_filename", "primary_reason", "all_reasons",
                      "file_format", "image_width", "image_height", "file_size", "moved_to"],
                     rejected_rows)

    def _dist(v):
        if not v:
            return {}
        v = sorted(v)
        return {"count": len(v), "min": v[0], "max": v[-1],
                "mean": round(statistics.fmean(v), 2),
                "median": round(statistics.median(v), 2),
                "p05": v[max(0, int(len(v) * .05))],
                "p95": v[min(len(v) - 1, int(len(v) * .95))]}

    report = {
        "generated_at": common.utcnow_iso(),
        "thresholds": {
            "MIN_WIDTH": config.MIN_WIDTH, "MIN_HEIGHT": config.MIN_HEIGHT,
            "MIN_FILE_BYTES": config.MIN_FILE_BYTES,
            "BLUR_LAPVAR_THRESHOLD": config.BLUR_LAPVAR_THRESHOLD,
            "PHASH_NEAR_DUP_DISTANCE": config.PHASH_NEAR_DUP_DISTANCE,
            "ACCEPTED_FORMATS": sorted(config.ACCEPTED_FORMATS),
            "MAX_IMAGE_PIXELS": config.MAX_IMAGE_PIXELS,
        },
        "counts": dict(stats),
        "phash_reliability": {
            "reliable": sum(1 for r in records if r.get("phash_reliable")),
            "unreliable_excluded_from_near_dup": stats["phash_unreliable"],
            "thresholds": {"min_grey_std": config.PHASH_MIN_GREY_STD,
                           "min_grey_entropy_bits": config.PHASH_MIN_GREY_ENTROPY_BITS},
        },
        "files_inspected": len(files),
        "per_source": {
            slug: {
                "inspected": sum(1 for r in records if r.get("slug") == slug),
                "pass": sum(1 for r in records if r.get("slug") == slug and r.get("quality_state") == "pass"),
                "rejected": sum(1 for r in records if r.get("slug") == slug and r.get("quality_state") == "rejected"),
                "duplicate": sum(1 for r in records if r.get("slug") == slug and r.get("quality_state") == "duplicate"),
                "reject_reasons": dict(collections.Counter(
                    next((x.split(":")[0] for x in r.get("rejection_reasons", [])
                          if x.split(":")[0] in REJECT_DIRS), "other")
                    for r in records
                    if r.get("slug") == slug and r.get("quality_state") == "rejected")),
            }
            for slug in sorted({r.get("slug") for r in records})
        },
        "reject_reason_breakdown": dict(reject_reason_counts),
        "format_breakdown": dict(format_counts),
        "dimension_stats": {
            "width": _dist(widths), "height": _dist(heights), "file_size_bytes": _dist(sizes),
            "blur_laplacian_variance": _dist(blur_scores),
        },
        "aspect_ratios": _dist([w / h for w, h in zip(widths, heights) if h]),
        "megapixel_distribution": _hist([w * h / 1e6 for w, h in zip(widths, heights)]),
    }
    common.write_json(config.REPORTS_DIR / "quality_control_report.json", report)
    common.write_json(DUPLICATE_REPORT_JSON, {
        "generated_at": common.utcnow_iso(),
        "method": {
            "exact": "SHA-256 over full file bytes; first occurrence canonical",
            "near": f"pHash(8x8=64-bit) with 4x16-bit LSH banding, "
                    f"confirmed by Hamming distance <= {config.PHASH_NEAR_DUP_DISTANCE}",
        },
        "exact_duplicate_groups": [
            {"canonical_image_id": k, "duplicates": v, "count": len(v)}
            for k, v in dup_groups.items() if v
        ],
        "near_duplicate_pairs": near_dup_pairs,
        "totals": {"exact_duplicate_files": stats["exact_duplicates"],
                   "near_duplicate_files": sum(1 for p in near_dup_pairs),
                   "exact_groups": len([g for g in dup_groups.values() if g])},
    })

    common.banner("QC SUMMARY")
    print(f" Files inspected ............ {len(files):,}")
    print(f" Passed ..................... {stats['passed']:,}")
    print(f" Rejected ................... {stats['rejected']:,}")
    print(f" Exact duplicates routed .... {stats['duplicates']:,}")
    print(f" Kept but flagged ........... {stats['flagged']:,}")
    print(f"\n Rejection breakdown:")
    for k, v in reject_reason_counts.most_common():
        print(f"   {k:<22} {v:,}")
    print(f"\n Formats: {dict(format_counts)}")
    if widths:
        print(f" Width  min/median/max: {min(widths)} / {int(statistics.median(widths))} / {max(widths)}")
        print(f" Height min/median/max: {min(heights)} / {int(statistics.median(heights))} / {max(heights)}")
    if blur_scores:
        print(f" Blur lapvar min/median/max: {min(blur_scores):.1f} / "
              f"{statistics.median(blur_scores):.1f} / {max(blur_scores):.1f}")
    print(f"\n Per-source breakdown:")
    print(f"   {'source':<24}{'pass':>7}{'reject':>8}{'dup':>6}{'total':>7}")
    for slug, info in report["per_source"].items():
        print(f"   {slug:<24}{info['pass']:>7}{info['rejected']:>8}"
              f"{info['duplicate']:>6}{info['inspected']:>7}")
    print(f"\n Reports -> reports/quality_control_report.json")
    print(f"            reports/duplicate_report.json")
    print(f"            metadata/rejected_manifest.csv")
    print("\n NOTE: raw_images/ was not modified. Rejected and duplicate files are")
    print("       COPIES; every original remains in place for audit.")
    return report


def _hist(values, buckets=(0, 0.1, 0.5, 1, 2, 5, 10, 50, 10**9)):
    out = collections.Counter()
    for v in values:
        for lo, hi in zip(buckets, buckets[1:]):
            if lo <= v < hi:
                out[f"{lo}-{hi if hi < 10**8 else 'inf'} MP"] += 1
                break
    return dict(sorted(out.items()))


def _normalise(img: Image.Image | None, dest: Path, name: str) -> Path | None:
    """Write a size-capped JPEG COPY. The original in raw_images/ is untouched."""
    if img is None:
        return None
    try:
        rgb = img.convert("RGB")
        w, h = rgb.size
        scale = min(1.0, config.PROCESSED_MAX_SIDE / max(w, h))
        if scale < 1.0:
            rgb = rgb.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        out = common.unique_path(dest, Path(name).stem + ".jpg")
        rgb.save(out, config.PROCESSED_FORMAT, quality=config.PROCESSED_QUALITY, optimize=True)
        return out
    except Exception as exc:                                  # noqa: BLE001
        common.log(f"normalisation failed for {name}: {exc}", level="WARN")
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--skip-blur", action="store_true",
                    help="skip the Laplacian-variance blur check (faster)")
    ap.add_argument("--keep-existing", action="store_true",
                    help="do NOT clear processed/rejected/duplicate images first; "
                         "appends to whatever a previous run left (default is to "
                         "reproduce them exactly)")
    args = ap.parse_args()
    for p in (QC_RECORDS,):
        if p.exists():
            p.unlink()          # rebuild the QC record set from scratch each run
    run(limit=args.limit, skip_blur=args.skip_blur, keep_existing=args.keep_existing)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
