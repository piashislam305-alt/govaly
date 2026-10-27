#!/usr/bin/env python3
"""
Validation suite for the QC detectors and the rights gate.

IMPORTANT: every fixture used here is GENERATED at runtime inside
scripts/tests/fixtures/ and is deliberately kept OUTSIDE research_dataset/
raw_images|processed_images. No synthetic file is ever allowed to enter the
research corpus - fabricating dataset content would corrupt exactly the
provenance guarantees this project exists to provide.

Run:  python3 tests/test_qc.py
"""
from __future__ import annotations

import io
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import common                                                    # noqa: E402
import config                                                    # noqa: E402
import qc                                                        # noqa: E402
from assess_source import assess                                 # noqa: E402
from collect import REFUSED_ACCESS_METHODS, sniff_format         # noqa: E402

FIX = HERE / "fixtures"

PASS, FAIL = [], []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name)
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f"  <- {detail}" if detail and not cond else ""))


# --------------------------------------------------------------------------- #
# Fixture generation
# --------------------------------------------------------------------------- #
def make_fixtures() -> dict[str, Path]:
    import numpy as np
    from PIL import Image, ImageFilter

    if FIX.exists():
        shutil.rmtree(FIX)
    FIX.mkdir(parents=True)

    rng = np.random.default_rng(1234)

    # Sharp, high-texture image -> high Laplacian variance
    noise = rng.integers(0, 256, (256, 256), dtype=np.uint8)
    sharp = Image.fromarray(noise, mode="L").convert("RGB")
    p_sharp = FIX / "sharp.png"; sharp.save(p_sharp)

    # Same image, heavily blurred -> low Laplacian variance
    blurred = sharp.filter(ImageFilter.GaussianBlur(radius=9))
    p_blur = FIX / "blurred.png"; blurred.save(p_blur)

    # Tiny image -> fails the minimum-resolution check
    p_tiny = FIX / "tiny.png"; Image.new("RGB", (8, 8), (200, 30, 30)).save(p_tiny)

    # Corrupt: valid JPEG header, truncated body
    buf = io.BytesIO(); sharp.save(buf, "JPEG", quality=90)
    full = buf.getvalue()
    p_trunc = FIX / "truncated.jpg"; p_trunc.write_bytes(full[: len(full) // 3])

    # Unsupported: plain text masquerading as a JPEG
    p_fake = FIX / "not_an_image.jpg"; p_fake.write_bytes(b"this is not image data at all\n" * 40)

    # Exact duplicate: byte-identical copy
    p_dup = FIX / "exact_dup.png"; shutil.copyfile(p_sharp, p_dup)

    # Near duplicate: imperceptibly altered (single-pixel change), same pHash
    near = sharp.copy()
    near.putpixel((5, 5), (0, 0, 0))
    p_near = FIX / "near_dup.png"; near.save(p_near)

    # Valid small-but-real image above the resolution floor
    p_ok = FIX / "ok_small.png"
    Image.fromarray(rng.integers(0, 256, (96, 96, 3), dtype=np.uint8), mode="RGB").save(p_ok)

    return {"sharp": p_sharp, "blurred": p_blur, "tiny": p_tiny, "truncated": p_trunc,
            "fake": p_fake, "exact_dup": p_dup, "near_dup": p_near, "ok_small": p_ok}


# --------------------------------------------------------------------------- #
def test_magic_sniffer(fx):
    print("\n[1] magic-byte format sniffer")
    check("png recognised", sniff_format(fx["sharp"].read_bytes()[:16]) == "PNG")
    check("jpeg recognised", sniff_format(fx["truncated"].read_bytes()[:16]) == "JPEG")
    check("text rejected", sniff_format(fx["fake"].read_bytes()[:16]) is None)
    check("empty rejected", sniff_format(b"") is None)
    check("classic TIFF LE recognised", sniff_format(b"II*\x00" + b"\x00" * 12) == "TIFF")
    check("classic TIFF BE recognised", sniff_format(b"MM\x00*" + b"\x00" * 12) == "TIFF")
    check("BigTIFF LE recognised", sniff_format(b"II+\x00" + b"\x00" * 12) == "TIFF")
    check("BigTIFF BE recognised", sniff_format(b"MM\x00+" + b"\x00" * 12) == "TIFF")
    check("RIFF non-WEBP rejected", sniff_format(b"RIFF\x00\x00\x00\x00AVI ") is None)
    check("RIFF WEBP recognised", sniff_format(b"RIFF\x00\x00\x00\x00WEBP") == "WEBP")
    check("ICO recognised", sniff_format(b"\x00\x00\x01\x00" + b"\x00" * 12) == "ICO")


def test_decode(fx):
    print("\n[2] corruption / decode detection")
    img, reasons = qc.check_decode(fx["sharp"])
    check("valid image decodes", img is not None and not reasons)
    img, reasons = qc.check_decode(fx["truncated"])
    check("truncated jpeg rejected", img is None and any(r.startswith("corrupt") for r in reasons),
          str(reasons))
    img, reasons = qc.check_decode(fx["fake"])
    check("fake image rejected", img is None and any(r.startswith("corrupt") for r in reasons))


def test_format(fx):
    print("\n[3] unsupported-format detection")
    img, _ = qc.check_decode(fx["sharp"])
    fmt, reasons = qc.check_format(fx["sharp"], img)
    check("png accepted", fmt == "PNG" and not reasons, str(reasons))
    img2, _ = qc.check_decode(fx["fake"])
    fmt2, reasons2 = qc.check_format(fx["fake"], img2)
    check("non-image flagged unsupported", any("unsupported_format" in r for r in reasons2),
          str(reasons2))


def test_resolution(fx):
    print("\n[4] minimum-resolution check")
    from PIL import Image
    w, h = Image.open(fx["tiny"]).size
    check("tiny image is below floor", w < config.MIN_WIDTH or h < config.MIN_HEIGHT)
    w2, h2 = Image.open(fx["ok_small"]).size
    check("96x96 image is above floor", w2 >= config.MIN_WIDTH and h2 >= config.MIN_HEIGHT)


def test_blur(fx):
    print("\n[5] blur detection (Laplacian variance)")
    from PIL import Image
    sharp_lv = qc.laplacian_variance(Image.open(fx["sharp"]))
    blur_lv = qc.laplacian_variance(Image.open(fx["blurred"]))
    check(f"sharp scores above threshold ({sharp_lv:.1f} >= {config.BLUR_LAPVAR_THRESHOLD})",
          sharp_lv >= config.BLUR_LAPVAR_THRESHOLD)
    check(f"blurred scores below threshold ({blur_lv:.1f} < {config.BLUR_LAPVAR_THRESHOLD})",
          blur_lv < config.BLUR_LAPVAR_THRESHOLD)
    check("sharp >> blurred", sharp_lv > blur_lv * 5, f"{sharp_lv:.1f} vs {blur_lv:.1f}")

    # resolution invariance: the same content at two sizes must score comparably
    big = Image.open(fx["sharp"]).resize((1024, 1024), Image.BILINEAR)
    big_lv = qc.laplacian_variance(big)
    check("score is size-normalised (within 3x across 4x upscale)",
          0.33 * sharp_lv <= big_lv <= 3.0 * sharp_lv, f"{sharp_lv:.1f} vs {big_lv:.1f}")


def test_exact_dup(fx):
    print("\n[6] exact duplicate detection (SHA-256)")
    a = common.sha256_file(fx["sharp"])
    b = common.sha256_file(fx["exact_dup"])
    c = common.sha256_file(fx["near_dup"])
    check("byte-identical files share a digest", a == b)
    check("one-pixel change alters the digest", a != c)
    check("digest is 64 hex chars", len(a) == 64 and all(ch in "0123456789abcdef" for ch in a))


def test_near_dup(fx):
    print("\n[7] near-duplicate detection (perceptual hash + LSH banding)")
    pa = common.perceptual_hash(fx["sharp"])
    pb = common.perceptual_hash(fx["near_dup"])
    pc = common.perceptual_hash(fx["blurred"])
    check("phash computed for valid images", pa is not None and pb is not None and pc is not None)
    if pa and pb and pc:
        d_near = common.hamming(pa[1], pb[1])
        d_far = common.hamming(pa[1], pc[1])
        check(f"near-duplicate within threshold ({d_near} <= {config.PHASH_NEAR_DUP_DISTANCE})",
              d_near <= config.PHASH_NEAR_DUP_DISTANCE)
        check(f"different image exceeds threshold ({d_far} > {config.PHASH_NEAR_DUP_DISTANCE})",
              d_far > config.PHASH_NEAR_DUP_DISTANCE)

    bands_a = qc.phash_bands(pa[1]) if pa else []
    bands_b = qc.phash_bands(pb[1]) if pb else []
    check("LSH banding emits 4 bands", len(bands_a) == 4)
    check("identical images collide in every band",
          bands_a == bands_b, f"{bands_a} vs {bands_b}")
    check("band ids are (index, hex) tuples",
          all(isinstance(i, int) and isinstance(h, str) for i, h in bands_a))


def test_filenames():
    print("\n[8] filename preservation")
    check("plain name preserved", common.safe_name("photo.jpg") == "photo.jpg")
    check("unicode preserved where safe", common.safe_name("café.jpg") in ("caf_.jpg", "café.jpg"))
    trav = common.safe_name("../../etc/passwd")
    check("path traversal neutralised (no separator survives)",
          "/" not in trav and "\\" not in trav, trav)
    check("absolute path neutralised", "/" not in common.safe_name("/etc/shadow"))
    check("null byte stripped", "\x00" not in common.safe_name("a\x00b.jpg"))
    check("long name truncated", len(common.safe_name("x" * 500 + ".jpg")) <= 120)
    check("empty name defaulted", common.safe_name("") == "unnamed")

    tmp = FIX / "collide"
    tmp.mkdir(exist_ok=True)
    p1 = common.unique_path(tmp, "a.jpg"); p1.write_bytes(b"1")
    p2 = common.unique_path(tmp, "a.jpg"); p2.write_bytes(b"2")
    check("collision does not overwrite", p1 != p2 and p1.read_bytes() == b"1")


def test_robots():
    print("\n[9] robots.txt gate fails closed")
    ok, reason = common.robots_allows("https://pypi.org/pypi/scikit-image/json")
    check("pypi JSON API is disallowed by robots.txt", ok is False, reason)
    ok2, reason2 = common.robots_allows("https://nonexistent-host-xyz-12345.invalid/x.jpg")
    check("unreachable host fails closed", ok2 is False, reason2)


def test_rights_gate():
    print("\n[10] rights assessment gate")
    base = {
        "slug": "t", "source_name": "t", "source_url": "https://x", "author": "A",
        "license": "CC-BY-4.0", "license_url": "https://x/lic", "content_class": "general",
        "access_method": "http_file_list", "redistribution_permitted": True,
        "derivative_works_permitted": True, "contains_identifiable_people": False,
    }
    check("fully-specified permissive source is approved",
          assess(dict(base))["rights_review_status"] == "approved")

    m = dict(base); m["license"] = ""
    check("missing licence is rejected", assess(m)["rights_review_status"] == "rejected")

    m = dict(base); m["redistribution_permitted"] = None
    check("unclear redistribution is NOT approved",
          assess(m)["rights_review_status"] != "approved")

    m = dict(base); m["content_class"] = "adult-explicit-scrape"
    r = assess(m)
    check("adult-scrape content class is terminally rejected",
          r["rights_review_status"] == "rejected"
          and any("content_class" in b for b in r["terminal_blockers"]))

    m = dict(base); m["terms_of_service_prohibit_scraping"] = True
    check("ToS-forbidden scraping is terminally rejected",
          assess(m)["rights_review_status"] == "rejected")

    m = dict(base); m["age_verification_unconfirmed"] = True
    check("unverified age records are terminally rejected",
          assess(m)["rights_review_status"] == "rejected")

    m = dict(base); m["requires_registration"] = True; m["registration_completed"] = False
    r = assess(m)
    check("unsigned DUA is awaiting_permission, not approved",
          r["rights_review_status"] == "awaiting_permission"
          and not r["terminal_blockers"])

    m = dict(base); m["license"] = "CC-BY-NC-4.0"; m["redistribution_permitted"] = False
    r = assess(m)
    check("research-only licence is downloadable with a recorded restriction",
          r["rights_review_status"] == "awaiting_permission"
          and any("redistribut" in c.lower() for c in r["conditions"]))

    m = dict(base); m["contains_identifiable_people"] = True; m["consent_position"] = ""
    check("missing consent position blocks approval",
          assess(m)["rights_review_status"] != "approved")

    for meth in REFUSED_ACCESS_METHODS:
        m = dict(base); m["access_method"] = meth
        check(f"access_method={meth} never approved",
              assess(m)["rights_review_status"] != "approved")


def test_registry_state():
    print("\n[11] the live registry matches the intended determinations")
    reg = common.read_json(config.SOURCES_REGISTRY_JSON)
    if not reg:
        check("registry exists", False, "run assess_source.py first")
        return
    by = {s["slug"]: s for s in reg["sources"]}
    check("registry is non-empty", len(by) > 0)
    check("pornpics-de is REJECTED", by.get("pornpics-de", {}).get("rights_review_status") == "rejected")
    check("pornpics-de carries terminal blockers",
          len(by.get("pornpics-de", {}).get("terminal_blockers", [])) >= 3)
    check("ebazarov URL corpus is REJECTED",
          by.get("ebazarov-nsfw-urls", {}).get("rights_review_status") == "rejected")
    for slug in ("opencv-samples-data", "pillow-test-images"):
        check(f"{slug} is approved", by.get(slug, {}).get("rights_review_status") == "approved")
    check("opencv consent exclusions are recorded",
          set(by.get("opencv-samples-data", {}).get("exclusions", {}).get("files", []))
          == {"lena.jpg", "lena_tmpl.jpg", "messi5.jpg"})
    check("no rejected source is marked reachable",
          not any(s["environment_reachable"] for s in reg["sources"]
                  if s["rights_review_status"] == "rejected"))


def test_no_fabricated_content():
    print("\n[12] integrity: no synthetic fixtures leaked into the corpus")
    fix_hashes = {common.sha256_file(p) for p in FIX.rglob("*") if p.is_file()}
    leaked = []
    for root in (config.RAW_DIR, config.PROCESSED_DIR, config.REJECTED_DIR, config.DUPLICATE_DIR):
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if p.is_file() and common.sha256_file(p) in fix_hashes:
                leaked.append(str(p))
    check("no test fixture appears in any dataset directory", not leaked, str(leaked[:3]))


def main() -> int:
    print("=" * 70)
    print("QC / RIGHTS-GATE VALIDATION SUITE")
    print("=" * 70)
    fx = make_fixtures()
    for fn in (test_magic_sniffer, test_decode, test_format, test_resolution, test_blur,
               test_exact_dup, test_near_dup, test_filenames, test_robots, test_rights_gate,
               test_registry_state, test_no_fabricated_content):
        fn(fx) if fn.__code__.co_argcount else fn()
    print("\n" + "=" * 70)
    print(f" PASSED {len(PASS)}   FAILED {len(FAIL)}")
    if FAIL:
        print(" Failures:")
        for f in FAIL:
            print(f"   - {f}")
    print("=" * 70)
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
