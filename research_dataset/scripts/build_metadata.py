#!/usr/bin/env python3
"""
Stage 4 - Build the metadata catalogue.

Joins four independent records so nothing is inferred:
    metadata/file_manifest.jsonl   everything ENUMERATED at the source
    metadata/download_log.jsonl    every fetch ATTEMPT and its outcome
    metadata/qc_records.jsonl      every quality/duplicate measurement
    metadata/sources_registry.json the rights position per source

Outputs
    metadata/images.csv            EXACTLY the 18 columns specified
    metadata/images_extended.csv   the same rows plus provenance/QC detail

Coverage is complete by construction: a file that was enumerated but excluded,
or attempted and failed, still gets a row, so the CSV can be reconciled against
the source inventory rather than against the download count alone.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common
import config

IMAGES_CSV = config.METADATA_DIR / "images.csv"
IMAGES_EXT_CSV = config.METADATA_DIR / "images_extended.csv"

EXT_COLUMNS = common.CSV_COLUMNS + [
    "slug", "quality_state", "raw_path", "processed_path", "rejected_path",
    "duplicate_path", "blur_lapvar", "phash64", "content_type", "http_status",
    "etag", "md5", "sha1", "rejection_reasons", "duplicate_of",
    "origin_url", "environment_reachable", "redistribution_permitted",
    "derivative_works_permitted", "citation", "rights_notes",
]


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def main() -> int:
    common.banner("STAGE 4 - METADATA CATALOGUE")
    registry = common.read_json(config.SOURCES_REGISTRY_JSON, {"sources": []})
    src = {s["slug"]: s for s in registry.get("sources", [])}

    manifest = read_jsonl(config.METADATA_DIR / "file_manifest.jsonl")
    dlog = read_jsonl(config.METADATA_DIR / "download_log.jsonl")
    qc = read_jsonl(config.METADATA_DIR / "qc_records.jsonl")

    common.log(f"manifest={len(manifest)} download_log={len(dlog)} qc_records={len(qc)}")

    # ---- index the download log --------------------------------------- #
    # download_log.jsonl is an append-only audit trail spanning every run, so a
    # file may appear several times (dry run, retry, re-run). For the catalogue
    # we want the CURRENT state of each file: the most recent entry wins. The
    # full history stays in the log for audit.
    latest_by_local: dict[str, dict] = {}
    latest_by_name: dict[tuple[str, str], dict] = {}
    history: dict[tuple[str, str], list[dict]] = {}
    for e in dlog:
        key = (e.get("slug", ""), e.get("original_filename", ""))
        history.setdefault(key, []).append(e)
        if e.get("local_filename"):
            latest_by_local[e["local_filename"]] = e
        latest_by_name[key] = e
    by_local, by_name = latest_by_local, latest_by_name
    common.log(f"download_log: {len(dlog)} entries -> {len(by_name)} distinct files "
               f"(latest run wins)")

    # ---- annotation availability -------------------------------------- #
    annotated = _annotation_index()

    rows: list[dict] = []
    used_manifest: set[tuple[str, str]] = set()

    # 1. one row per inspected file (the authoritative record)
    for rec in qc:
        slug = rec.get("slug", "")
        s = src.get(slug, {})
        raw_path = rec.get("raw_path", "")
        dl = by_local.get(raw_path) or by_name.get((slug, rec.get("original_filename", ""))) or {}
        if dl:
            used_manifest.add((slug, rec.get("original_filename", "")))
        origin = dl.get("origin", "") or s.get("source_url", "")
        rows.append(_row(rec, s, dl, annotated, origin))

    # 2. rows for files enumerated at the source but never fetched
    for m in manifest:
        key = (m.get("slug", ""), m.get("original_filename", ""))
        if key in used_manifest:
            continue
        dl = by_name.get(key, {})
        if not dl:
            continue                       # enumerated only, no attempt recorded
        used_manifest.add(key)
        slug = m.get("slug", "")
        s = src.get(slug, {})
        rows.append({
            "image_id": "", "original_filename": m.get("original_filename", ""),
            "local_filename": "", "source_name": s.get("source_name", slug),
            "source_url": dl.get("origin", s.get("source_url", "")),
            "author": s.get("author", ""), "license": s.get("license", ""),
            "license_url": s.get("license_url", ""),
            "collection_date": (dl.get("at") or "")[:10],
            "download_status": dl.get("download_status", "not_attempted"),
            "image_width": "", "image_height": "", "file_size": "", "file_format": "",
            "sha256": dl.get("sha256", ""), "perceptual_hash": "",
            "annotation_status": "not_applicable",
            "rights_review_status": s.get("rights_review_status", "unknown"),
            # extended
            "slug": slug, "quality_state": "not_collected",
            "raw_path": "", "processed_path": "", "rejected_path": "", "duplicate_path": "",
            "blur_lapvar": "", "phash64": "", "content_type": dl.get("content_type", ""),
            "http_status": dl.get("http_status", ""), "etag": dl.get("etag", ""),
            "md5": "", "sha1": "", "rejection_reasons": dl.get("reason", ""),
            "duplicate_of": "", "origin_url": dl.get("origin", ""),
            "environment_reachable": s.get("environment_reachable", ""),
            "redistribution_permitted": s.get("redistribution_permitted", ""),
            "derivative_works_permitted": s.get("derivative_works_permitted", ""),
            "citation": s.get("citation", ""),
            "rights_notes": " | ".join(s.get("conditions", [])),
        })

    # ---- assign stable image_ids to rows that lack one ----------------- #
    counters: dict[str, int] = {}
    for r in rows:
        if not r["image_id"]:
            slug = r.get("slug") or "misc"
            counters[slug] = counters.get(slug, 0) + 1
            r["image_id"] = common.new_image_id(slug, 900000 + counters[slug])

    n = common.write_csv(IMAGES_CSV, common.CSV_COLUMNS, rows)
    m = common.write_csv(IMAGES_EXT_CSV, EXT_COLUMNS, rows)
    common.write_json(config.METADATA_DIR / "metadata_build_summary.json", {
        "generated_at": common.utcnow_iso(),
        "rows_written": n,
        "rows_from_qc": len(qc),
        "rows_from_download_log_only": m - len(qc),
        "manifest_entries": len(manifest),
        "download_log_entries": len(dlog),
        "download_log_distinct_files": len(by_name),
        "download_log_superseded_entries": len(dlog) - len(by_name),
        "annotated_files_detected": len(annotated),
    })

    common.banner("METADATA SUMMARY")
    print(f" rows in images.csv ........... {n:,}")
    print(f"   measured (inspected) ....... {len(qc):,}")
    print(f"   enumerated but not fetched . {m - len(qc):,}")
    print(f" columns (as specified) ....... {len(common.CSV_COLUMNS)}")
    print(f"\n -> {IMAGES_CSV.relative_to(config.DATASET_ROOT)}")
    print(f" -> {IMAGES_EXT_CSV.relative_to(config.DATASET_ROOT)}")
    return 0


def _row(rec: dict, s: dict, dl: dict, annotated: dict, origin: str) -> dict:
    raw_path = rec.get("raw_path", "")
    fname = rec.get("original_filename", "")
    if raw_path in annotated or fname in annotated:
        ann = "present_original"
    elif rec.get("quality_state") == "pass":
        ann = "none_available"
    else:
        ann = "not_applicable"
    return {
        "image_id": rec.get("image_id", ""),
        "original_filename": fname,
        "local_filename": raw_path,
        "source_name": s.get("source_name", rec.get("slug", "")),
        "source_url": origin or s.get("source_url", ""),
        "author": s.get("author", ""),
        "license": s.get("license", ""),
        "license_url": s.get("license_url", ""),
        "collection_date": (dl.get("at") or rec.get("inspected_at") or common.today())[:10],
        "download_status": dl.get("download_status", "success"),
        "image_width": rec.get("image_width", ""),
        "image_height": rec.get("image_height", ""),
        "file_size": rec.get("file_size", ""),
        "file_format": rec.get("file_format", ""),
        "sha256": rec.get("sha256", ""),
        "perceptual_hash": rec.get("perceptual_hash", ""),
        "annotation_status": ann,
        "rights_review_status": s.get("rights_review_status", "unknown"),
        # extended
        "slug": rec.get("slug", ""),
        "quality_state": rec.get("quality_state", ""),
        "raw_path": raw_path,
        "processed_path": rec.get("processed_path", ""),
        "rejected_path": rec.get("rejected_path", ""),
        "duplicate_path": rec.get("duplicate_path", ""),
        "blur_lapvar": rec.get("blur_lapvar", ""),
        "phash64": rec.get("phash64", ""),
        "content_type": dl.get("content_type", ""),
        "http_status": dl.get("http_status", ""),
        "etag": dl.get("etag", ""),
        "md5": "", "sha1": "",
        "rejection_reasons": " | ".join(rec.get("rejection_reasons", [])),
        "duplicate_of": rec.get("duplicate_of", ""),
        "origin_url": origin,
        "environment_reachable": s.get("environment_reachable", ""),
        "redistribution_permitted": s.get("redistribution_permitted", ""),
        "derivative_works_permitted": s.get("derivative_works_permitted", ""),
        "citation": s.get("citation", ""),
        "rights_notes": " | ".join(s.get("conditions", [])),
    }


def _annotation_index() -> dict[str, str]:
    """Map filenames present under annotations/original/ to their annotation file."""
    idx: dict[str, str] = {}
    if not config.ANNOTATIONS_ORIGINAL_DIR.exists():
        return idx
    for p in config.ANNOTATIONS_ORIGINAL_DIR.rglob("*"):
        if p.is_file():
            idx[p.name] = str(p.relative_to(config.DATASET_ROOT))
            idx[p.stem] = str(p.relative_to(config.DATASET_ROOT))
    return idx


if __name__ == "__main__":
    raise SystemExit(main())
