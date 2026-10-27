#!/usr/bin/env python3
"""
Stage 1 - Source investigation and licence / permission assessment.

This stage runs BEFORE any image is downloaded. It reads source manifests from
scripts/sources/*.json, verifies the rights position of each, and writes:

    metadata/sources_registry.json
    metadata/sources_registry.csv
    metadata/source_assessments/<slug>.json

Rights determination logic (all checks must pass for "approved"):

  1. A named licence must be present, and it must be one this project treats as
     granting academic-research + ML-training use.
  2. A licence URL or verbatim licence text must be recorded.
  3. A named author / rights holder must be recorded.
  4. Redistribution permission must be answered explicitly (yes / no / unclear).
  5. Derivative-work permission must be answered explicitly.
  6. The source must not require bypassing authentication, paywalls, CAPTCHAs
     or other access controls to obtain the images.
  7. The content class must not be a hard exclusion (config.HARD_EXCLUDED_*).
  8. Consent / privacy / age-verification position must be stated for any
     source containing images of identifiable people.

Anything that fails a check but could pass with a signature, a data-use
agreement, or an e-mail to the rights holder is marked "awaiting_permission"
rather than "rejected", and the exact missing item is recorded.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import common
import config

# --------------------------------------------------------------------------- #
# The assessment
# --------------------------------------------------------------------------- #

def assess(manifest: dict) -> dict:
    """Return a full rights-assessment record for one source manifest."""
    slug = manifest["slug"]
    findings: list[dict] = []
    blockers: list[dict] = []          # {"severity": terminal|resolvable, "text": ...}
    conditions: list[str] = []

    def add_blocker(name: str, detail: str, severity: str = "terminal") -> None:
        blockers.append({"severity": severity, "check": name, "text": f"{name}: {detail}"})

    def check(name: str, ok: bool, detail: str, *, blocking: bool = True,
              severity: str = "terminal") -> None:
        findings.append({"check": name, "passed": bool(ok),
                         "detail": detail, "severity": severity})
        if not ok and blocking:
            add_blocker(name, detail, severity)

    # --- 0. hard content exclusions ------------------------------------- #
    content_class = manifest.get("content_class", "general")
    check(
        "content_class_not_excluded",
        content_class not in config.HARD_EXCLUDED_CONTENT_CLASSES,
        f"content_class={content_class!r}",
    )

    # --- 1. licence identified ------------------------------------------ #
    lic = (manifest.get("license") or "").strip()
    check("license_identified", bool(lic) and lic.lower() not in {"", "unknown", "none"},
          f"license={lic or '<missing>'}")

    lic_norm = lic.upper().replace(" ", "")
    permissive = any(k.upper().replace(" ", "") == lic_norm for k in config.PERMISSIVE_LICENSE_IDS)
    research_only = any(k.upper().replace(" ", "") == lic_norm for k in config.RESEARCH_ONLY_LICENSE_IDS)
    check(
        "license_grants_research_and_ml_training",
        permissive or research_only or manifest.get("research_use_explicitly_granted") is True,
        f"permissive={permissive} research_only={research_only} "
        f"explicit_grant={manifest.get('research_use_explicitly_granted')}",
        severity="resolvable",
    )

    # --- 2. licence text locatable -------------------------------------- #
    lic_url = manifest.get("license_url") or ""
    check("license_url_recorded", bool(lic_url), lic_url or "<missing>",
          severity="resolvable")

    # --- 3. author / rights holder -------------------------------------- #
    author = manifest.get("author") or ""
    check("author_identified", bool(author) and author.lower() not in {"unknown", "anonymous"},
          author or "<missing>", severity="resolvable")

    # --- 4. redistribution --------------------------------------------- #
    redist = manifest.get("redistribution_permitted")
    check("redistribution_position_stated", redist in (True, False),
          f"redistribution_permitted={redist!r} (must be true/false, not null)",
          severity="resolvable")
    if redist is False:
        conditions.append("MUST NOT be redistributed, mirrored or published; local research use only.")
    if redist is None:
        add_blocker("redistribution_position_stated",
                    "redistribution permission is UNCLEAR", "resolvable")

    # --- 5. derivative works ------------------------------------------- #
    deriv = manifest.get("derivative_works_permitted")
    check("derivative_works_position_stated", deriv in (True, False),
          f"derivative_works_permitted={deriv!r}", severity="resolvable")
    if deriv is False:
        conditions.append("No derivative works: originals may be analysed but not transformed for release.")

    # --- 6. access method must be lawful ------------------------------- #
    access = manifest.get("access_method", "")
    forbidden_access = {"auth_bypass", "paywall_bypass", "captcha_bypass", "scrape_against_tos"}
    check("access_method_lawful", access not in forbidden_access, f"access_method={access!r}")

    # Access methods that can only be satisfied by a human act (accepting a
    # gated DUA, or corresponding with the dataset authors). Not unlawful - but
    # never auto-approvable, and the collector refuses them independently.
    # Keeping this check here means the registry and the collector cannot drift.
    human_act_access = {"hf_gated_dataset", "author_request"}
    check("access_method_self_service", access not in human_act_access,
          f"access_method={access!r} requires gated approval or author correspondence "
          f"that the researcher must complete personally",
          severity="resolvable")
    if manifest.get("requires_registration") and not manifest.get("registration_completed"):
        add_blocker("requires_registration",
                    "registration/DUA not completed - the researcher must accept the terms "
                    "personally; this pipeline will never do so on their behalf", "resolvable")
    if manifest.get("terms_of_service_prohibit_scraping") is True:
        add_blocker("terms_of_service_prohibit_scraping",
                    "site ToS forbids automated collection", "terminal")

    # --- 7. consent / privacy / age ------------------------------------ #
    if manifest.get("contains_identifiable_people"):
        check("consent_position_stated",
              bool(manifest.get("consent_position")),
              manifest.get("consent_position") or "<missing: required when images show identifiable people>",
              severity="resolvable")
    if manifest.get("contains_minor_risk") or manifest.get("age_verification_unconfirmed"):
        add_blocker(
            "age_verification",
            "source provides no verifiable age/consent records (no 18 U.S.C. 2257-equivalent "
            "custodian of records). Collection refused.", "terminal")

    # --- 8. provenance of the collection itself ------------------------ #
    if manifest.get("provenance_unclear"):
        add_blocker("provenance_unclear",
                    "original author/rights chain cannot be established", "resolvable")

    # --- status ---------------------------------------------------------- #
    terminal = [b for b in blockers if b["severity"] == "terminal"]
    resolvable = [b for b in blockers if b["severity"] == "resolvable"]

    if terminal:
        # A terminal blocker cannot be cured by a signature, a fee or a DUA: the
        # source is refused outright.
        status = "rejected"
    elif resolvable or manifest.get("requires_dua_signature"):
        # Every outstanding item has a named human action that would clear it.
        status = "awaiting_permission"
        if manifest.get("requires_dua_signature"):
            conditions.append("Data Use Agreement must be accepted by the researcher before download.")
    elif conditions:
        status = "awaiting_permission"
    else:
        status = "approved"

    blockers = [b["text"] for b in blockers]
    terminal_texts = [b["text"] for b in terminal]
    resolvable_texts = [b["text"] for b in resolvable]

    return {
        "slug": slug,
        "source_name": manifest.get("source_name", slug),
        "source_url": manifest.get("source_url", ""),
        "author": author,
        "license": lic,
        "license_url": lic_url,
        "content_class": content_class,
        "access_method": access,
        "estimated_image_count": manifest.get("estimated_image_count"),
        "count_basis": manifest.get("count_basis", ""),
        "formats": manifest.get("formats", []),
        "annotations_available": manifest.get("annotations_available", False),
        "label_definitions": manifest.get("label_definitions", []),
        "assessment_date": common.utcnow_iso(),
        "rights_review_status": status,
        "blockers": blockers,
        "terminal_blockers": terminal_texts,
        "resolvable_blockers": resolvable_texts,
        "conditions": conditions,
        "checks": findings,
        "notes": manifest.get("notes", ""),
        # Operational reachability is deliberately tracked SEPARATELY from the
        # rights status. A source can be fully approved and still unfetchable
        # from this environment; conflating the two would misreport the legal
        # position.
        "environment_reachable": manifest.get("environment_reachable", True),
        "exclusions": manifest.get("exclusions", {"files": [], "reason": ""}),
        "access_config": manifest.get("access_config", {}),
        "annotation_config": manifest.get("annotation_config", {}),
        "annotation_notes": manifest.get("annotation_notes", ""),
        # carried through so downstream stages can stamp every row
        "redistribution_permitted": redist,
        "derivative_works_permitted": deriv,
        "research_use_explicitly_granted": manifest.get("research_use_explicitly_granted"),
        "consent_position": manifest.get("consent_position", ""),
        "attribution_required": manifest.get("attribution_required", False),
        "citation": manifest.get("citation", ""),
    }


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #

def load_manifests() -> list[dict]:
    manifests = []
    for path in sorted(config.SOURCES_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            common.log(f"Skipping malformed manifest {path.name}: {exc}", level="ERROR")
            continue
        entries = data if isinstance(data, list) else [data]
        for entry in entries:
            entry.setdefault("_manifest_path", str(path))
            manifests.append(entry)
    return manifests


def main() -> int:
    common.banner("STAGE 1 - SOURCE INVESTIGATION & RIGHTS ASSESSMENT")
    manifests = load_manifests()
    if not manifests:
        common.log("No source manifests found in scripts/sources/. Nothing assessed.", level="WARN")
        return 1

    assessments = [assess(m) for m in manifests]
    for a in assessments:
        common.write_json(config.ASSESSMENTS_DIR / f"{a['slug']}.json", a)

    # ---- registry (JSON is authoritative; CSV is for humans/spreadsheets) -- #
    registry = {
        "generated_at": common.utcnow_iso(),
        "policy": {
            "required_rights_status": config.REQUIRED_RIGHTS_STATUS,
            "permissive_license_ids": sorted(config.PERMISSIVE_LICENSE_IDS),
            "research_only_license_ids": sorted(config.RESEARCH_ONLY_LICENSE_IDS),
            "hard_excluded_content_classes": sorted(config.HARD_EXCLUDED_CONTENT_CLASSES),
        },
        "totals": {
            "collections_discovered": len(assessments),
            "approved_for_research_use": sum(a["rights_review_status"] == "approved" for a in assessments),
            "awaiting_permission": sum(a["rights_review_status"] == "awaiting_permission" for a in assessments),
            "rejected": sum(a["rights_review_status"] == "rejected" for a in assessments),
            "approved_and_reachable_from_this_environment": sum(
                a["rights_review_status"] == "approved" and a["environment_reachable"]
                for a in assessments),
            "approved_but_unreachable_from_this_environment": sum(
                a["rights_review_status"] == "approved" and not a["environment_reachable"]
                for a in assessments),
            "awaiting_permission_reachable": sum(
                a["rights_review_status"] == "awaiting_permission" and a["environment_reachable"]
                for a in assessments),
        },
        "sources": assessments,
    }
    common.write_json(config.SOURCES_REGISTRY_JSON, registry)

    reg_rows = [
        {
            "source_name": a["source_name"], "slug": a["slug"], "source_url": a["source_url"],
            "author": a["author"], "license": a["license"], "license_url": a["license_url"],
            "content_class": a["content_class"], "access_method": a["access_method"],
            "estimated_image_count": a["estimated_image_count"] or "",
            "count_basis": a["count_basis"],
            "annotations_available": a["annotations_available"],
            "redistribution_permitted": a["redistribution_permitted"],
            "derivative_works_permitted": a["derivative_works_permitted"],
            "rights_review_status": a["rights_review_status"],
            "environment_reachable": a["environment_reachable"],
            "terminal_blockers": " | ".join(a["terminal_blockers"]),
            "resolvable_blockers": " | ".join(a["resolvable_blockers"]),
            "conditions": " | ".join(a["conditions"]),
            "citation": a["citation"],
            "assessment_date": a["assessment_date"],
        }
        for a in assessments
    ]
    common.write_csv(config.SOURCES_REGISTRY_CSV, list(reg_rows[0].keys()) if reg_rows else [], reg_rows)

    # ---- console progress ------------------------------------------------ #
    common.banner("ASSESSMENT RESULT")
    for a in assessments:
        mark = {"approved": "OK  ", "awaiting_permission": "WAIT", "rejected": "NO  "}[a["rights_review_status"]]
        count = a["estimated_image_count"]
        count_s = f"{count:,}" if isinstance(count, int) else str(count)
        reach = "" if a["environment_reachable"] else "  [unreachable from this sandbox]"
        print(f" [{mark}] {a['slug']:<34} {count_s:>10} imgs  {a['license'] or '<no licence>'}{reach}")
        for b in a["terminal_blockers"]:
            print(f"        TERMINAL  - {b}")
        for b in a["resolvable_blockers"]:
            print(f"        RESOLVABLE- {b}")
        for c in a["conditions"]:
            print(f"        CONDITION- {c}")

    t = registry["totals"]
    print("\n " + "-" * 60)
    print(f" Collections discovered ............ {t['collections_discovered']}")
    print(f" Approved for research use ......... {t['approved_for_research_use']}")
    print(f" Awaiting permission ............... {t['awaiting_permission']}")
    print(f" Rejected .......................... {t['rejected']}")
    print(f"   ...approved AND fetchable from here: {t['approved_and_reachable_from_this_environment']}")
    print(f"   ...approved but unreachable here:   {t['approved_but_unreachable_from_this_environment']}")
    def _count(pred):
        return sum(a["estimated_image_count"] for a in assessments
                   if pred(a) and isinstance(a["estimated_image_count"], int))
    ap = lambda a: a["rights_review_status"] == "approved"
    aw = lambda a: a["rights_review_status"] == "awaiting_permission"
    print(f" Estimated images, approved+reachable ...... {_count(lambda a: ap(a) and a['environment_reachable']):,}")
    print(f" Estimated images, approved+UNreachable .... {_count(lambda a: ap(a) and not a['environment_reachable']):,}")
    print(f" Estimated images, awaiting permission ..... {_count(aw):,}")
    print(f" Estimated images, rejected ................ {_count(lambda a: a['rights_review_status'] == 'rejected'):,}")
    print(f"\n Registry -> {config.SOURCES_REGISTRY_CSV.relative_to(config.DATASET_ROOT)}")
    print(f"            {config.SOURCES_REGISTRY_JSON.relative_to(config.DATASET_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
