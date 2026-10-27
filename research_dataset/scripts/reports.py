#!/usr/bin/env python3
"""
Stage 5 - Reports.

Renders the machine-readable artefacts from stages 1-4 into human-readable
reports, including the coverage reconciliation that separates:

    listed by source  ->  accessible  ->  legally eligible  ->  downloaded
                      ->  excluded (and why)

These five numbers are reported separately on purpose. Collapsing them is how a
dataset ends up claiming complete coverage it does not have.
"""
from __future__ import annotations

import collections
import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common
import config

PROGRESS_JSON = config.REPORTS_DIR / "progress_tracker.json"
PROGRESS_MD = config.REPORTS_DIR / "progress_tracker.md"
FAILURES_CSV = config.REPORTS_DIR / "download_failure_report.csv"
FAILURES_MD = config.REPORTS_DIR / "download_failure_report.md"
DUPLICATES_MD = config.REPORTS_DIR / "duplicate_report.md"
QC_MD = config.REPORTS_DIR / "quality_control_report.md"
STATS_MD = config.REPORTS_DIR / "dataset_statistics.md"
COVERAGE_MD = config.REPORTS_DIR / "coverage_reconciliation.md"


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def fmt(n) -> str:
    return f"{n:,}" if isinstance(n, int) else str(n)


def main() -> int:
    common.banner("STAGE 5 - REPORTS")
    registry = common.read_json(config.SOURCES_REGISTRY_JSON, {"sources": [], "totals": {}})
    qc_rep = common.read_json(config.REPORTS_DIR / "quality_control_report.json", {})
    dup_rep = common.read_json(config.REPORTS_DIR / "duplicate_report.json", {})
    col_stats = common.read_json(config.METADATA_DIR / "collect_stats.json", {"sources": []})
    dlog = read_jsonl(config.METADATA_DIR / "download_log.jsonl")
    manifest = read_jsonl(config.METADATA_DIR / "file_manifest.jsonl")
    images = common.read_csv(config.METADATA_DIR / "images.csv")

    per_slug = {s["slug"]: s for s in col_stats.get("sources", [])}
    tot = registry["totals"]

    # ---------------- progress tracker (section 9) ---------------------- #
    n_exact_qc = dup_rep.get("totals", {}).get("exact_duplicate_files", 0)
    n_near = len(dup_rep.get("near_duplicate_pairs", []))

    # download_log.jsonl is append-only across runs, so collapse it to the
    # CURRENT state of each file before counting. Counting raw log lines would
    # double-count anything seen by a dry run or an earlier attempt.
    latest: dict[tuple[str, str], dict] = {}
    for e in dlog:
        latest[(e.get("slug", ""), e.get("original_filename", ""))] = e
    state = list(latest.values())

    failed = [e for e in state if e.get("download_status") == "failed"]
    excluded = [e for e in state if e.get("download_status", "").startswith("excluded")]
    dedup_skipped = [e for e in state if e.get("download_status") == "skipped_already_present"]
    # Exact duplicates are caught in two places: at download time (identical
    # bytes never re-fetched) and in QC (SHA-256 over what is on disk). Report
    # both rather than silently dropping one.
    n_exact_download = len(dedup_skipped)
    n_exact = n_exact_qc + n_exact_download

    downloaded = sum(s.get("downloaded", 0) for s in col_stats.get("sources", []))
    discovered_files = len({(m.get("slug", ""), m.get("original_filename", "")) for m in manifest})

    progress = {
        "generated_at": common.utcnow_iso(),
        "total_collections_discovered": tot.get("collections_discovered", 0),
        "collections_approved_for_research_use": tot.get("approved_for_research_use", 0),
        "collections_awaiting_permission": tot.get("awaiting_permission", 0),
        "collections_rejected": tot.get("rejected", 0),
        "total_images_discovered": discovered_files,
        "total_images_successfully_collected": downloaded,
        "total_images_rejected_by_qc": qc_rep.get("counts", {}).get("rejected", 0),
        "exact_duplicates": n_exact,
        "exact_duplicates_skipped_at_download_time": n_exact_download,
        "exact_duplicates_found_by_qc": n_exact_qc,
        "near_duplicates": n_near,
        "failed_downloads": len(failed),
        "excluded_before_download": len(excluded),
        "qc_passed": qc_rep.get("counts", {}).get("passed", 0),
        "http_requests_issued": col_stats.get("http_requests_issued", 0),
        "bytes_downloaded": (sum(s.get("bytes", 0) for s in col_stats.get("sources", []))
                             or col_stats.get("bytes_downloaded", 0)),
    }
    common.write_json(PROGRESS_JSON, progress)

    lines = ["# Progress tracker", "",
             f"_Generated {progress['generated_at']}_", "",
             "## Collections", "",
             "| Metric | Count |", "|---|---:|",
             f"| Total collections discovered | {fmt(progress['total_collections_discovered'])} |",
             f"| Collections approved for research use | {fmt(progress['collections_approved_for_research_use'])} |",
             f"| Collections awaiting permission | {fmt(progress['collections_awaiting_permission'])} |",
             f"| Collections rejected | {fmt(progress['collections_rejected'])} |",
             "", "## Images", "",
             "| Metric | Count |", "|---|---:|",
             f"| Total images discovered (enumerated at source) | {fmt(discovered_files)} |",
             f"| Total images successfully collected | {fmt(downloaded)} |",
             f"| Passed quality control | {fmt(progress['qc_passed'])} |",
             f"| Total images rejected by QC | {fmt(progress['total_images_rejected_by_qc'])} |",
             f"| Exact duplicates (SHA-256) | {fmt(n_exact)} |",
             f"| Near duplicates (pHash) | {fmt(n_near)} |",
             f"| Failed downloads | {fmt(len(failed))} |",
             f"| Excluded before download (consent/provenance) | {fmt(len(excluded))} |",
             "", "## Network", "",
             f"- HTTP requests issued: {fmt(progress['http_requests_issued'])}",
             f"- Bytes downloaded: {progress['bytes_downloaded'] / 1e6:.2f} MB",
             "",
             "## Per-source", "",
             "| Source | Discovered | Downloaded | Excluded | Failed |",
             "|---|---:|---:|---:|---:|"]
    for s in col_stats.get("sources", []):
        lines.append(f"| {s['slug']} | {fmt(s.get('discovered', 0))} | {fmt(s.get('downloaded', 0))} "
                     f"| {fmt(s.get('excluded_by_manifest', 0))} | {fmt(s.get('failed', 0))} |")
    PROGRESS_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ---------------- download failure report --------------------------- #
    common.write_csv(FAILURES_CSV,
                     ["slug", "original_filename", "error", "origin", "at"],
                     [{"slug": e.get("slug", ""), "original_filename": e.get("original_filename", ""),
                       "error": e.get("error", ""), "origin": e.get("origin", ""),
                       "at": e.get("at", "")} for e in failed])
    by_err = collections.Counter(e.get("error", "unknown").split(":")[0] for e in failed)
    fl = ["# Download failure report", "",
          f"_Generated {progress['generated_at']}_", "",
          f"**Total failures: {len(failed)}**", "",
          "Every failure below was retried up to "
          f"{config.MAX_RETRIES} times with exponential backoff before being recorded.", ""]
    if failed:
        fl += ["## By error class", "", "| Error class | Count |", "|---|---:|"]
        fl += [f"| {k} | {v} |" for k, v in by_err.most_common()]
        fl += ["", "## Detail", "", "| Source | File | Error | Origin |", "|---|---|---|---|"]
        fl += [f"| {e.get('slug','')} | {e.get('original_filename','')} | "
               f"`{e.get('error','')[:110]}` | {e.get('origin','')} |" for e in failed[:500]]
    else:
        fl.append("No download failures were recorded. Every enumerated, non-excluded file "
                  "in every approved source was fetched successfully.")
    fl += ["", "## Excluded before download (not failures)", "",
           "These were refused deliberately by the source manifest on consent/provenance "
           "grounds, not because a request failed.", "",
           "| Source | File | Reason |", "|---|---|---|"]
    fl += [f"| {e.get('slug','')} | {e.get('original_filename','')} | {e.get('reason','')[:220]} |"
           for e in excluded]
    FAILURES_MD.write_text("\n".join(fl) + "\n", encoding="utf-8")

    # ---------------- duplicate report ---------------------------------- #
    dl = ["# Duplicate report", "",
          f"_Generated {progress['generated_at']}_", "",
          "## Method", "",
          f"- **Exact duplicates:** {dup_rep.get('method', {}).get('exact', '')}",
          f"- **Near duplicates:** {dup_rep.get('method', {}).get('near', '')}", "",
          "## Totals", "",
          "| Metric | Count |", "|---|---:|",
          f"| Exact duplicate files (total) | {fmt(n_exact)} |",
          f"| &nbsp;&nbsp;caught at download time (bytes never re-fetched) | {fmt(n_exact_download)} |",
          f"| &nbsp;&nbsp;caught by QC over files on disk | {fmt(n_exact_qc)} |",
          f"| Exact duplicate groups on disk | {fmt(dup_rep.get('totals', {}).get('exact_groups', 0))} |",
          f"| Near duplicate pairs | {fmt(n_near)} |", "",
          "> Duplicate and near-duplicate files are **copied** to `duplicate_images/`.",
          "> The originals remain untouched in `raw_images/`. Nothing was deleted.", "",
          "## Perceptual-hash reliability", "",
          "A pHash is only informative when the image has enough structure for its DCT to",
          "discriminate. Flat, solid-colour and near-uniform images collapse onto a handful of",
          "degenerate hashes and would otherwise generate a combinatorial explosion of **false**",
          "near-duplicate pairs. Such images are excluded from near-duplicate pairing and flagged",
          "`phash_reliable=false`; they are still retained in the corpus, and exact SHA-256",
          "deduplication still applies to them.", "",
          "| Measure | Count |", "|---|---:|",
          f"| pHash reliable (used for near-duplicate detection) | {fmt(qc_rep.get('phash_reliability', {}).get('reliable', 0))} |",
          f"| pHash unreliable (excluded from near-duplicate pairing) | {fmt(qc_rep.get('phash_reliability', {}).get('unreliable_excluded_from_near_dup', 0))} |",
          ""]
    groups = dup_rep.get("exact_duplicate_groups", [])
    if groups:
        dl += ["## Exact duplicate groups", ""]
        for g in groups[:200]:
            dl += [f"- canonical `{g['canonical_image_id']}` -> {g['count']} duplicate(s)"]
            for d in g["duplicates"]:
                dl.append(f"  - `{d}`")
    pairs = dup_rep.get("near_duplicate_pairs", [])
    if pairs:
        dl += ["", "## Near-duplicate pairs", "",
               "| Image | Near-duplicate of | Hamming distance |", "|---|---|---:|"]
        dl += [f"| {p['image_id']} | {p['duplicate_of']} | {p['hamming_distance']} |"
               for p in pairs[:300]]
    DUPLICATES_MD.write_text("\n".join(dl) + "\n", encoding="utf-8")

    # ---------------- QC report ----------------------------------------- #
    ql = ["# Quality-control report", "",
          f"_Generated {progress['generated_at']}_", "",
          "## Thresholds applied", "",
          "| Parameter | Value |", "|---|---|"]
    for k, v in qc_rep.get("thresholds", {}).items():
        ql.append(f"| {k} | {v} |")
    ql += ["", "## Outcome", "", "| State | Count |", "|---|---:|"]
    for k in ("passed", "rejected", "duplicates", "flagged"):
        ql.append(f"| {k} | {fmt(qc_rep.get('counts', {}).get(k, 0))} |")
    ql.append(f"| **files inspected** | **{fmt(qc_rep.get('files_inspected', 0))}** |")
    ql += ["", "## Rejection reasons", "", "| Reason | Count |", "|---|---:|"]
    for k, v in sorted(qc_rep.get("reject_reason_breakdown", {}).items(),
                       key=lambda t: -t[1]):
        ql.append(f"| {k} | {fmt(v)} |")
    ql += ["", "## Formats", "", "| Format | Count |", "|---|---:|"]
    for k, v in sorted(qc_rep.get("format_breakdown", {}).items(), key=lambda t: -t[1]):
        ql.append(f"| {k} | {fmt(v)} |")
    ql += ["", "## Dimension and quality statistics", "",
           "| Measure | Count | Min | p05 | Median | Mean | p95 | Max |",
           "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for name, key in [("Width (px)", "width"), ("Height (px)", "height"),
                      ("File size (bytes)", "file_size_bytes"),
                      ("Blur: Laplacian variance", "blur_laplacian_variance")]:
        d = qc_rep.get("dimension_stats", {}).get(key, {})
        if d:
            ql.append(f"| {name} | {fmt(d.get('count', 0))} | {fmt(d.get('min'))} | "
                      f"{fmt(d.get('p05'))} | {fmt(d.get('median'))} | {d.get('mean')} | "
                      f"{fmt(d.get('p95'))} | {fmt(d.get('max'))} |")
    ar = qc_rep.get("aspect_ratios", {})
    if ar:
        ql += ["", f"Aspect ratio: min {ar.get('min')}, median {ar.get('median')}, max {ar.get('max')}"]
    mp = qc_rep.get("megapixel_distribution", {})
    if mp:
        ql += ["", "## Megapixel distribution", "", "| Bucket | Count |", "|---|---:|"]
        ql += [f"| {k} | {fmt(v)} |" for k, v in mp.items()]
    ql += ["", "## Note on interpretation", "",
           "The Laplacian-variance blur score is a **triage heuristic**, not a ground-truth",
           "image-quality label. It is resolution- and content-dependent: a genuinely sharp",
           "image of a smooth, low-texture subject scores low, and a noisy or heavily",
           "compressed image can score high. For publishable image-quality assessment,",
           "pair it with a human-rated benchmark such as KonIQ-10k (see the source registry),",
           "which ships crowdsourced mean opinion scores.", "",
           "Rejected files are **copied** to `rejected_images/<reason>/<source>/` with the",
           "reason recorded in `metadata/rejected_manifest.csv`. Originals are never deleted."]
    QC_MD.write_text("\n".join(ql) + "\n", encoding="utf-8")

    # ---------------- coverage reconciliation --------------------------- #
    cl = ["# Coverage reconciliation", "",
          f"_Generated {progress['generated_at']}_", "",
          "This is the report that answers \"did you get everything?\". The five numbers below",
          "are **not** interchangeable and must not be collapsed into one.", "",
          "| # | Measure | Count | Basis |", "|---|---|---:|---|"]

    listed = sum(s.get("estimated_image_count") or 0 for s in registry["sources"]
                 if isinstance(s.get("estimated_image_count"), int))
    listed_appr = sum(s.get("estimated_image_count") or 0 for s in registry["sources"]
                      if s.get("rights_review_status") == "approved"
                      and isinstance(s.get("estimated_image_count"), int))
    listed_appr_reach = sum(s.get("estimated_image_count") or 0 for s in registry["sources"]
                            if s.get("rights_review_status") == "approved"
                            and s.get("environment_reachable")
                            and isinstance(s.get("estimated_image_count"), int))
    excluded_files = sum(s.get("excluded_by_manifest", 0) for s in col_stats.get("sources", []))

    cl += [
        f"| 1 | Images **listed by the sources** (all 13 collections, incl. rejected) | {fmt(listed)} | "
        "publisher-stated counts in the registry |",
        f"| 2 | Images listed by **approved** collections only | {fmt(listed_appr)} | registry |",
        f"| 3 | Images listed by collections that are approved **and reachable from this environment** "
        f"| {fmt(listed_appr_reach)} | registry |",
        f"| 4 | Files actually **enumerated at the source** during this run | {fmt(discovered_files)} | "
        "file_manifest.jsonl |",
        f"| 5 | Images **legally eligible** after per-file consent/provenance exclusions "
        f"| {fmt(discovered_files - excluded_files)} | manifest minus exclusions |",
        f"| 6 | Images **successfully downloaded** | {fmt(downloaded)} | download_log.jsonl |",
        f"| 7 | Images that then **passed quality control** | {fmt(progress['qc_passed'])} | qc_records.jsonl |",
    ]
    cl += ["", "## Exclusions, and why", "",
           "| Source | File | Reason |", "|---|---|---|"]
    for e in excluded:
        cl.append(f"| {e.get('slug','')} | `{e.get('original_filename','')}` | {e.get('reason','')[:300]} |")
    cl += ["", "## Collections not collected, and why", "",
           "| Collection | Rights status | Estimated images | Blocking reason |",
           "|---|---|---:|---|"]
    for s in registry["sources"]:
        if s.get("rights_review_status") == "approved" and s.get("environment_reachable"):
            continue
        reason = "; ".join(s.get("terminal_blockers", [])[:2]) or \
                 "; ".join(s.get("resolvable_blockers", [])[:2]) or \
                 ("approved but unreachable from this sandbox's egress allowlist"
                  if s.get("rights_review_status") == "approved" else "")
        cl.append(f"| {s['slug']} | {s.get('rights_review_status')} | "
                  f"{fmt(s.get('estimated_image_count') or 'not stated')} | {reason[:300]} |")
    cl += ["", "## Statement of completeness", "",
           f"- Of the {fmt(listed_appr_reach)} images in approved-and-reachable collections, "
           f"{fmt(discovered_files)} were enumerated and {fmt(downloaded)} were downloaded.",
           f"- {fmt(excluded_files)} files were deliberately withheld on consent/provenance grounds.",
           f"- {fmt(len(failed))} downloads failed.",
           f"- **No claim is made about the {fmt(listed - listed_appr_reach)} images in collections "
           "that are rejected or awaiting permission or unreachable.** Those were not collected.",
           "",
           "The content-safety arm of the research objective is therefore **not** covered by this",
           "run: every collection that would supply it is either awaiting a data-use agreement the",
           "researcher must sign personally, or was refused outright. See `README.md`."]
    COVERAGE_MD.write_text("\n".join(cl) + "\n", encoding="utf-8")

    # ---------------- dataset statistics -------------------------------- #
    sl = ["# Dataset statistics", "",
          f"_Generated {progress['generated_at']}_", "",
          "## Layout", "", "```",
          "research_dataset/",
          f"  raw_images/          {_count_files(config.RAW_DIR)} files ({_du(config.RAW_DIR)}) - byte-exact originals",
          f"  processed_images/    {_count_files(config.PROCESSED_DIR)} files ({_du(config.PROCESSED_DIR)}) - normalised copies",
          f"  duplicate_images/    {_count_files(config.DUPLICATE_DIR)} files - copies routed out of the working set",
          f"  rejected_images/     {_count_files(config.REJECTED_DIR)} files - copies + reasons, never deleted",
          f"  annotations/         {_count_files(config.ANNOTATIONS_DIR)} files",
          f"  metadata/            {_count_files(config.METADATA_DIR)} files",
          f"  reports/             {_count_files(config.REPORTS_DIR)} files",
          "```", "",
          "## Rows in images.csv", "", f"{fmt(len(images))} total", ""]
    for col in ("download_status", "rights_review_status", "annotation_status"):
        c = collections.Counter(r.get(col, "") for r in images)
        sl += [f"### {col}", "", "| Value | Count |", "|---|---:|"]
        sl += [f"| `{k or '(empty)'}` | {fmt(v)} |" for k, v in c.most_common()]
        sl.append("")
    c = collections.Counter(r.get("source_name", "") for r in images)
    sl += ["### by source", "", "| Source | Count |", "|---|---:|"]
    sl += [f"| {k} | {fmt(v)} |" for k, v in c.most_common()]
    sl += ["", "## Quality state (from images_extended.csv)", ""]
    ext = common.read_csv(config.METADATA_DIR / "images_extended.csv")
    c = collections.Counter(r.get("quality_state", "") for r in ext)
    sl += ["| State | Count |", "|---|---:|"]
    sl += [f"| `{k or '(empty)'}` | {fmt(v)} |" for k, v in c.most_common()]
    STATS_MD.write_text("\n".join(sl) + "\n", encoding="utf-8")

    # ---------------- console ------------------------------------------- #
    common.banner("PROGRESS TRACKER")
    for k, v in progress.items():
        if k == "generated_at":
            continue
        print(f" {k.replace('_', ' ') .ljust(46)} {fmt(v)}")
    print(f"\n Reports written to {config.REPORTS_DIR.relative_to(config.DATASET_ROOT)}/")
    for f in (PROGRESS_MD, FAILURES_MD, DUPLICATES_MD, QC_MD, COVERAGE_MD, STATS_MD):
        print(f"   - {f.name}")
    return 0


def _count_files(root: Path) -> int:
    return sum(1 for p in root.rglob("*") if p.is_file()) if root.exists() else 0


def _du(root: Path) -> str:
    if not root.exists():
        return "0 B"
    n = sum(p.stat().st_size for p in root.rglob("*") if p.is_file())
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} B"
        n /= 1024
    return f"{n:.1f} GB"


if __name__ == "__main__":
    raise SystemExit(main())
