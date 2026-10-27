#!/usr/bin/env python3
"""
Stage 3b - Annotation preservation.

Rules enforced here:
    * Existing labels and annotation files are copied VERBATIM into
      annotations/original/<slug>/. They are never edited, re-encoded or renamed.
    * Original label definitions are transcribed from the source manifest into
      annotations/original/<slug>/LABEL_DEFINITIONS.md, marked as transcribed.
    * Nothing is invented. If a source ships no labels, annotation_status stays
      "none_available" and no labels are synthesised.
    * Anything this pipeline derives goes to annotations/derived/, physically
      separate from the originals.
    * Ambiguous cases are written to a human-review queue rather than guessed.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common
import config
from collect import Fetcher, _gh

REVIEW_QUEUE = config.ANNOTATIONS_DERIVED_DIR / "human_review_queue.csv"
ANNOTATION_INDEX = config.METADATA_DIR / "annotation_index.json"

# Annotation companions worth preserving; videos are catalogued but not pulled
# into an image dataset.
ANNOTATION_EXTENSIONS = {".xml", ".yml", ".yaml", ".json", ".txt", ".csv", ".data", ".tsv"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tif", ".tiff", ".webp",
                    ".ppm", ".pcx", ".ico"}
VIDEO_EXTENSIONS = {".avi", ".mp4", ".mov", ".mkv", ".webm"}


def git_blob_sha1(path: Path) -> str:
    """Compute a file's git blob SHA-1 locally: sha1(b"blob <len>\\0" + content).

    This is exactly the value the GitHub API reports in each entry's `sha` field,
    so an already-preserved annotation file can be verified as unchanged with no
    network request at all. Re-running the stage is therefore idempotent and does
    not accumulate __1/__2 copies.
    """
    import hashlib
    data = path.read_bytes()
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def preserve_github_dir(fetcher: Fetcher, assessment: dict) -> dict:
    """
    Preserve annotation / ground-truth companions for one source.

    Candidates come from `annotation_config`, which must state EITHER an explicit
    list of repo-relative `files` OR a `path` directory to scan. It deliberately
    does NOT fall back to the image `access_config`: reusing that scanned a repo
    ROOT for one source and pulled in CI configuration files (codecov.yml,
    readthedocs.yml) as if they were annotations. Mislabelling build metadata as
    ground truth is exactly the kind of provenance error this project exists to
    prevent, so an absent annotation_config now means "nothing to preserve".
    """
    ac = assessment.get("annotation_config") or {}
    slug = assessment["slug"]
    if not ac or "repo" not in ac:
        return {"slug": slug, "preserved": [], "skipped": [],
                "note": "no annotation_config declared; nothing preserved"}
    repo, ref = ac["repo"], ac.get("ref", "HEAD")
    dest = config.ANNOTATIONS_ORIGINAL_DIR / slug
    dest.mkdir(parents=True, exist_ok=True)

    # Build the candidate entry list.
    listing: list[dict] = []
    if ac.get("files"):
        for rel in ac["files"]:
            try:
                entry = _gh(fetcher, f"https://api.github.com/repos/{repo}/contents/"
                                     f"{rel}?ref={ref}")
                if isinstance(entry, dict) and entry.get("type") == "file":
                    listing.append(entry)
            except Exception as exc:                            # noqa: BLE001
                common.log(f"[{slug}] annotation file {rel} unavailable: {exc}", level="WARN")
    elif ac.get("path"):
        found = _gh(fetcher, f"https://api.github.com/repos/{repo}/contents/"
                             f"{ac['path']}?ref={ref}")
        listing = [e for e in found if e.get("type") == "file"]
    else:
        return {"slug": slug, "preserved": [], "skipped": [],
                "note": "annotation_config declares neither 'files' nor 'path'"}

    preserved, skipped = [], []
    for entry in listing:
        if entry.get("type") != "file":
            continue
        name = entry["name"]
        suffix = Path(name).suffix.lower()
        if not ac.get("files") and suffix in IMAGE_EXTENSIONS:
            # In directory-scan mode the images themselves are the collector's
            # job, not the annotation stage's. Ignoring them silently keeps the
            # skipped list meaningful (it should describe annotation candidates
            # that were passed over, not the whole image corpus).
            continue
        if ac.get("files") and name not in ac["files"] and \
                entry["path"] not in ac["files"]:
            skipped.append({"file": name, "size": entry.get("size"),
                            "reason": "not in the declared annotation allow-list"})
            continue
        if suffix in VIDEO_EXTENSIONS:
            skipped.append({"file": name, "size": entry.get("size"),
                            "reason": "video companion; out of scope for an image dataset "
                                      "(catalogued for provenance only)"})
            continue
        if suffix not in ANNOTATION_EXTENSIONS and not ac.get("files"):
            skipped.append({"file": name, "size": entry.get("size"),
                            "reason": f"extension {suffix or '(none)'} is not an annotation type"})
            continue
        if entry.get("size", 0) > config.MAX_SINGLE_FILE_BYTES:
            skipped.append({"file": name, "size": entry.get("size"), "reason": "exceeds size cap"})
            continue
        try:
            # Idempotency: if the identical bytes are already preserved, record it
            # and skip the request. Re-running must not accumulate __1/__2 copies.
            existing = dest / common.safe_name(name)
            if existing.exists() and git_blob_sha1(existing) == entry.get("sha"):
                preserved.append({"file": name,
                                  "stored_as": str(existing.relative_to(config.DATASET_ROOT)),
                                  "bytes": existing.stat().st_size,
                                  "sha256": common.sha256_file(existing),
                                  "origin": f"https://github.com/{repo}/blob/{ref}/{entry['path']}",
                                  "note": "already present and unchanged; not re-fetched"})
                continue
            import base64
            data = _gh(fetcher, f"https://api.github.com/repos/{repo}/contents/"
                                f"{entry['path']}?ref={ref}")
            payload = base64.b64decode(data["content"]) if data.get("content") else None
            if payload is None:
                payload = fetcher.get_bytes(entry["download_url"])[0]
            target = common.unique_path(dest, common.safe_name(name))
            target.write_bytes(payload)
            preserved.append({"file": name, "stored_as": str(target.relative_to(config.DATASET_ROOT)),
                              "bytes": len(payload),
                              "sha256": common.sha256_bytes(payload),
                              "origin": f"https://github.com/{repo}/blob/{ref}/{entry['path']}"})
        except Exception as exc:                                # noqa: BLE001
            skipped.append({"file": name, "size": entry.get("size"),
                            "reason": f"fetch failed: {exc.__class__.__name__}: {exc}"})

    # Transcribe the label definitions exactly as recorded in the manifest.
    defs = assessment.get("label_definitions") or []
    lines = [f"# Label definitions - {assessment['source_name']}", "",
             f"Source: {assessment['source_url']}",
             f"Licence: {assessment['license']} ({assessment['license_url']})",
             f"Transcribed: {common.utcnow_iso()}", "",
             "**Transcribed verbatim from the source assessment manifest.** These definitions",
             "were recorded during rights assessment. Nothing below was inferred, relabelled",
             "or extended by this pipeline.", ""]
    if defs:
        lines += [f"- {d}" for d in defs]
    else:
        lines += ["- This source ships NO classification labels.",
                  "- `annotation_status` is therefore recorded as `none_available` for every",
                  "  image from this source, and **no labels have been synthesised**."]
    (dest / "LABEL_DEFINITIONS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    return {"slug": assessment["slug"], "preserved": preserved, "skipped": skipped,
            "label_definitions_transcribed": len(defs)}


def build_review_queue() -> list[dict]:
    """
    Flag genuinely ambiguous cases for a human. We never resolve these ourselves:
    guessing a label would be inventing data.
    """
    rows: list[dict] = []
    qc_records = _read_jsonl(config.METADATA_DIR / "qc_records.jsonl")
    by_id = {r.get("image_id"): r for r in qc_records}

    for rec in qc_records:
        for r in rec.get("rejection_reasons", []):
            if r.startswith("format_mismatch"):
                rows.append({
                    "image_id": rec.get("image_id", ""),
                    "file": rec.get("raw_path", ""),
                    "issue": "container_mismatch",
                    "detail": r,
                    "group_size": 1,
                    "why_review_needed": "Declared format disagrees with the magic bytes. Could be a "
                                         "mislabelled file, a truncated container, or a valid but "
                                         "unusual encoding. Needs a human decision, not a guess.",
                    "suggested_action": "Inspect manually; confirm whether to keep, repair or reject.",
                })

    # Near-duplicates: aggregate into ONE row per canonical group. Emitting a row
    # per pair produced thousands of near-identical entries and buried the cases
    # that actually need a decision.
    dup_rep = common.read_json(config.REPORTS_DIR / "duplicate_report.json", {}) or {}
    groups: dict[str, list[dict]] = {}
    for pair in dup_rep.get("near_duplicate_pairs", []):
        groups.setdefault(pair["duplicate_of"], []).append(pair)
    for canon, pairs in sorted(groups.items(), key=lambda t: -len(t[1])):
        members = [by_id.get(p["image_id"], {}) for p in pairs]
        rows.append({
            "image_id": canon,
            "file": by_id.get(canon, {}).get("raw_path", ""),
            "issue": "near_duplicate_group_ambiguous",
            "detail": "; ".join(f"{by_id.get(p['image_id'], {}).get('original_filename', p['image_id'])}"
                                f"(d={p['hamming_distance']})" for p in pairs[:12])
                      + (" ..." if len(pairs) > 12 else ""),
            "group_size": len(pairs) + 1,
            "why_review_needed": "Perceptually similar but not byte-identical. May be true redundancy, "
                                 "or legitimately distinct samples - e.g. the same picture stored in "
                                 "several containers to exercise different decoders, a stereo "
                                 "calibration pair, or consecutive frames. A pHash cannot tell these "
                                 "apart, so they were KEPT rather than removed.",
            "suggested_action": "Visually inspect the group; if genuinely redundant, move the extras "
                                "from processed_images/ to duplicate_images/. Do not delete originals.",
        })
    # Sources that claim annotations but for which none were matched.
    registry = common.read_json(config.SOURCES_REGISTRY_JSON, {"sources": []})
    index = common.read_json(ANNOTATION_INDEX, {}) or {}
    for s in registry["sources"]:
        if s.get("annotations_available") and s.get("rights_review_status") == "approved":
            if not index.get(s["slug"], {}).get("preserved"):
                rows.append({
                    "image_id": "", "file": f"<source:{s['slug']}>",
                    "issue": "annotations_expected_but_absent", "group_size": 0,
                    "detail": "manifest declares annotations_available=true",
                    "why_review_needed": "The source is documented as having annotations, but none were "
                                         "located during collection. Either the annotation adapter does not "
                                         "cover this source's layout, or the labels genuinely are absent.",
                    "suggested_action": "Check the source manually before treating the corpus as unlabelled.",
                })
    return rows


def _read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--no-fetch", action="store_true",
                    help="only rebuild the review queue; do not fetch annotation files")
    args = ap.parse_args()

    common.banner("STAGE 3b - ANNOTATION PRESERVATION")
    config.ANNOTATIONS_ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    config.ANNOTATIONS_DERIVED_DIR.mkdir(parents=True, exist_ok=True)

    registry = common.read_json(config.SOURCES_REGISTRY_JSON, {"sources": []})
    approved = [s for s in registry["sources"]
                if s.get("rights_review_status") == config.REQUIRED_RIGHTS_STATUS
                and s.get("environment_reachable", True)]

    index: dict = {}
    if not args.no_fetch:
        fetcher = Fetcher()
        for s in approved:
            if not s.get("annotations_available"):
                continue
            common.log(f"[{s['slug']}] preserving annotation companions")
            index[s["slug"]] = preserve_github_dir(fetcher, s)
            n = len(index[s["slug"]]["preserved"])
            common.log(f"[{s['slug']}] preserved {n} annotation file(s), "
                       f"skipped {len(index[s['slug']]['skipped'])}")
        common.write_json(ANNOTATION_INDEX, {"generated_at": common.utcnow_iso(), "sources": index})

    rows = build_review_queue()
    common.write_csv(REVIEW_QUEUE,
                     ["image_id", "file", "issue", "group_size", "detail",
                      "why_review_needed", "suggested_action"],
                     rows)

    # Derived-annotation README: makes the separation explicit and auditable.
    (config.ANNOTATIONS_DERIVED_DIR / "README.md").write_text(
        "# Derived annotations\n\n"
        f"_Generated {common.utcnow_iso()}_\n\n"
        "Everything in this directory was produced **by this pipeline**, not by the original\n"
        "source authors. It is kept physically separate from `annotations/original/` so that\n"
        "original ground truth can never be confused with generated output.\n\n"
        "## Contents\n\n"
        "- `human_review_queue.csv` - ambiguous cases flagged for a human decision.\n\n"
        "## What is deliberately NOT here\n\n"
        "No classification labels have been generated for any image. Neither approved source\n"
        "ships class labels, and this pipeline does not invent them. Any label you need must\n"
        "come from either (a) an annotation file preserved under `annotations/original/`, or\n"
        "(b) a human or model annotator, recorded separately with its own provenance.\n",
        encoding="utf-8")

    common.banner("ANNOTATION SUMMARY")
    for slug, info in index.items():
        print(f" {slug:<24} preserved={len(info['preserved']):<3} "
              f"skipped={len(info['skipped']):<3} "
              f"label_defs_transcribed={info['label_definitions_transcribed']}")
    print(f"\n Human-review queue: {len(rows)} item(s)")
    print(f"   -> {REVIEW_QUEUE.relative_to(config.DATASET_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
