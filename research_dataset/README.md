# Research Image Dataset — Collection, Rights Assessment & Quality Control

**Status: complete for the approved scope. The supplied source was refused. Read §1 first.**

A reproducible pipeline that investigates image sources, verifies their licence and consent
position *before* downloading anything, collects only what is legally eligible, and produces
quality-controlled images with full provenance metadata.

---

## 1. The supplied URL was refused — and why

You supplied **`https://www.pornpics.de/`** as the collection target. It was **rejected at the
rights-assessment gate. Zero requests were issued to it and zero files were collected from it.**

This is not a technical limitation. It is the assessment you asked for, applied honestly. Under
your own protocol — *"Never interpret public accessibility as permission for unrestricted reuse"*
and *"Exclude collections whose required permissions are missing or unclear"* — this source fails
on every limb:

| Requirement in your brief | Finding for pornpics.de |
|---|---|
| Identify the exact licence | **None.** No licence, no terms of reuse, no research grant. |
| Find the original source and author | **Not identifiable.** An aggregator gallery; images are third-party producer works. No rights chain. |
| Academic research / ML training permitted? | **No grant exists** to evaluate. |
| Redistribution permitted? | **No.** Commercial gallery content; on-site viewing only. |
| Derivative works permitted? | **No.** |
| Consent position for depicted people | **Unverifiable per image.** No way to confirm any depicted person consented to onward copying into a research corpus. |
| Age-verification records | **Absent.** No custodian-of-records equivalent. |
| Access method | Scraping against the site's terms of service. |

Three consequences make this disqualifying rather than merely awkward:

1. **It reproduces copyrighted works without authorisation.** The images belong to producers and
   photographers. A gallery displaying them is not a licence to copy them.
2. **The resulting dataset could never be used.** No redistribution rights means no published
   benchmark, no shared corpus, no thesis appendix — which defeats the stated objectives of
   "dataset analysis and benchmarking."
3. **Collection itself creates liability that no stated research intent cures.** An unvetted
   scrape of an adult aggregator cannot distinguish lawful commercial content from
   non-consensual intimate imagery or unlawful material. Building such a corpus makes the
   researcher a possessor and potential redistributor of material they cannot screen in advance.
   This risk is inherent to the *method*, not to the topic.

I did not enumerate the site to produce an image count, because enumeration is the first step of
the collection you asked me not to begin until permissions cleared — and they did not clear.

### What I did instead

Content-safety classification is a legitimate and valuable research area, and there are properly
curated, licence-clear corpora built for exactly it. I assessed seven of them (§3) and wired them
into the same pipeline. The blocker is a **signature you must provide**, not a technical one.

I also built and validated the entire pipeline end-to-end against two permissively-licensed
corpora that *were* collectable from this environment (§4), so the machinery is proven and ready
for the moment your data-use agreements land.

---

## 2. What was built

```
research_dataset/
├── raw_images/            817 files (34 MB) — byte-exact originals, never modified
├── processed_images/      293 files (10 MB) — normalised copies that passed QC
├── annotations/
│   ├── original/           14 files — 12 annotation/ground-truth files preserved
│   │                       verbatim + 2 transcribed LABEL_DEFINITIONS.md
│   └── derived/            human_review_queue.csv (153 items) + provenance README
├── metadata/               25 files — images.csv, registry, audit logs, QC records
├── duplicate_images/        0 files (all exact duplicates caught before download)
├── rejected_images/       524 files (13 MB) — copies, organised by rejection reason
├── reports/                11 files — the reports listed in §7
└── scripts/                the pipeline + 65-check validation suite
```

**Nothing is ever deleted.** Rejected and duplicate files are *copies*; every original stays in
`raw_images/` for audit.

---

## 3. Source & licence registry

13 collections assessed. Full machine-readable detail in
[`metadata/sources_registry.csv`](metadata/sources_registry.csv) and per-source check results in
[`metadata/source_assessments/`](metadata/source_assessments/).

### Approved and collected (2)

| Collection | Licence | Author | Images | Notes |
|---|---|---|---:|---|
| OpenCV `samples/data` | Apache-2.0 | OpenCV Contributors | 94 enumerated → **91 collected** | 3 withheld on consent grounds (below) |
| Pillow `Tests/images` | MIT-CMU | Jeffrey 'Alex' Clark & contributors | 735 enumerated → **726 collected** | Decoder edge-case corpus; 9 byte-duplicates skipped |

Both licence texts were **fetched and read**, not assumed. Apache-2.0 grants an express patent
licence and permits reproduction, modification and redistribution with attribution. MIT-CMU is
equally permissive.

### Approved but unreachable from this environment (2)

| Collection | Licence | Images | Why not collected |
|---|---|---:|---|
| Open Images V7 | CC-BY-4.0 | ~1.9 M | `storage.googleapis.com` outside the sandbox egress allowlist |
| KonIQ-10k | CC-BY-4.0 | 10,073 | `database.mmsp-kn.de` outside the sandbox egress allowlist |

**Rights are clear; only network reachability blocked them.** These are recorded as `approved`,
not as failures — conflating a legal position with a network limitation would misreport both.
Run the pipeline on your own network and they collect without any manifest change.

KonIQ-10k is the one to prioritise: it ships **crowdsourced human mean-opinion-scores**, which is
real ground truth for your image-quality-assessment objective. The Laplacian-variance score this
pipeline computes is only a triage heuristic (§6).

### Awaiting permission (7)

| Collection | Licence / gate | Est. images | What is needed |
|---|---|---:|---|
| **UnsafeBench** | Data Use Agreement (gated) | 10,146 | Accept the DUA on Hugging Face. **Best fit for content-safety classification** — 11 unsafe categories, human-annotated, academic curators. |
| **USD** (UnsafeSceneDetection) | Community Licence, case-by-case | not stated | Accept the gate. No redistribution, no mirroring, secure storage required. |
| **LSPD** | Custom research licence, by request | 500,000 | E-mail the authors. See the caveat below. |
| **C4Censor** | Not published | not stated | Contact authors. Attractive: 4 coarse / 12 fine classes, beyond binary porn-vs-neutral. |
| scikit-image `skimage.data` | Per-image licences **not stated in the package** | 28 | Transcribe each image's licence from upstream docs. |
| deepghs/nsfw_detect | Self-declared MIT | 10–100 K | Verify provenance (below). |
| cloverxion/image-moderation | "other", research-only | not stated | Institutional ethics approval + written terms. |

**On LSPD:** it is the standard academic benchmark for this task and widely cited, but its images
are themselves scraped from adult websites. Routing through the authors partly repairs the chain
that a direct scrape lacks — it does not fully repair it. Weigh that explicitly.

**On self-declared licences:** `deepghs/nsfw_detect` carries an MIT tag. That tag is only as good
as the uploader's own rights in the images, which cannot be verified. A permissive licence on
scraped NSFW imagery is treated as **unverified** until the provenance chain is documented. This
is why it sits in *awaiting*, not *approved*.

### Rejected (2)

| Collection | Terminal reason |
|---|---|
| **pornpics.de** (your supplied URL) | See §1. |
| EBazarov/nsfw_data_source_urls | 1.59 M **URLs**, not images. Resolving them means scraping third-party hosts — exactly what your brief forbids. Repo is marked historical/unmaintained; most links are dead. |

### Consent exclusions applied *within* an approved source

Apache-2.0 on the OpenCV repository does not convey rights in every image inside it. Three files
were withheld:

| File | Reason |
|---|---|
| `lena.jpg` | The 1972 Playboy centrefold crop. Lena Söderberg has publicly stated she does not want the image used; IEEE and Nature-family journals have retired it. |
| `lena_tmpl.jpg` | A crop of the same work. |
| `messi5.jpg` | Press photograph of an identifiable living individual; underlying rights are not conveyed by the repository's code licence. |

A permissive licence on a *collection* is not a permissive licence on *every item in it*. The
pipeline enforces per-file exclusion lists for exactly this reason.

---

## 4. Collection results

| Metric | Value |
|---|---:|
| Files enumerated at source | **829** |
| Successfully downloaded | **817** |
| Withheld on consent/provenance grounds | **3** |
| Skipped (identical bytes already held) | **9** |
| Failed downloads | **0** |
| Bytes written | 32,701,308 (31.2 MiB) |
| HTTP requests issued | 828 |

`829 = 817 + 3 + 9`. Coverage is exact, and the reconciliation is in
[`reports/coverage_reconciliation.md`](reports/coverage_reconciliation.md).

Formats collected: PNG 435, JPEG 112, TIFF 98, BMP 54, GIF 37, WEBP 14, ICO 8, PPM 5, PCX 3.

---

## 5. Quality control results

| Outcome | Count |
|---|---:|
| Passed | **229** |
| Rejected | **524** |
| Kept but flagged (near-duplicate / unreliable pHash) | **64** |
| Exact duplicates routed out | **0** (all 9 caught before download) |

| Source | Pass | Reject | Pass rate |
|---|---:|---:|---:|
| OpenCV `samples/data` | 76 | 11 | 83.5% |
| Pillow `Tests/images` | 153 | 513 | 21.1% |

**The low Pillow pass rate is the correct result, not a defect.** That corpus is a *decoder test
suite* deliberately composed of malformed, truncated and out-of-specification files. Its 46
corrupt files include `badheadersize.bmp`, `badpalettesize.bmp`, `chunk_no_fctl.png` and
`ossfuzz-4836216264589312.pcx` (a real OSS-Fuzz crash reproducer). It was included precisely to
prove the detectors fire on authentic failures rather than synthetic ones.

Rejection breakdown: too-small-file 242, blurry 161, low-resolution 53, corrupt 46,
unsupported-format 17, excessive-pixels 5.

**Blur detector validation.** The 11 OpenCV blur rejections are the deliberately degraded fixtures
`text_defocus.jpg` (lapvar 9.6), `licenseplate_motion.jpg` (12.5) and `text_motion.jpg` (30.9),
plus flat graphics like `gradient.png` (1.4). Genuinely sharp photographs all scored well above
threshold. The detector is correctly calibrated at 40.

---

## 6. Two methodological decisions worth your attention

### Perceptual hashes lie about flat images

85 visually distinct Pillow fixtures collapsed onto the *same* pHash
(`8000000000000000`) because they are solid-colour or near-uniform — their DCT is degenerate, so
the hash carries no information. Naively pairing them generated **8,662 false near-duplicate
pairs**.

The pipeline now gates near-duplicate detection on image information content (greyscale standard
deviation ≥ 2.0 **and** Shannon entropy ≥ 2.5 bits). 461 images were flagged `phash_reliable=false`
and excluded from pairing; 305 remained. False pairs fell from 8,662 to **1,689** — and the
survivors are real: Pillow's `hopper.bmp/.gif/.jpg/.png` family (one picture, many containers) and
OpenCV's `left11`/`left14` stereo frames.

### Near-duplicates are flagged, never auto-removed

A pHash collision does not prove redundancy. `left11.jpg` and `left14.jpg` are *distinct* frames
of a stereo calibration set; deleting one would destroy valid data. So:

- **Exact duplicate (SHA-256)** → routed to `duplicate_images/`. Provably zero information loss.
- **Near duplicate (pHash)** → **kept** in `processed_images/`, flagged, and queued for human
  review in `annotations/derived/human_review_queue.csv` (153 aggregated groups, not 1,689 pairs).

### Laplacian variance is a triage filter, not an IQA metric

It is resolution- and content-dependent: a sharp image of a smooth subject scores low, a noisy one
scores high. For publishable image-quality assessment, pair it with KonIQ-10k's human MOS labels.

---

## 7. Deliverables

| # | Requested | Where |
|---|---|---|
| 1 | Downloaded eligible image collection | `raw_images/` (817 originals), `processed_images/` (293 QC-passed) |
| 2 | Source and licence registry | `metadata/sources_registry.csv` · `.json` · `source_assessments/` |
| 3 | Image metadata CSV (18 columns) | `metadata/images.csv` (+ `images_extended.csv` sidecar) |
| 4 | Annotation files | `annotations/original/` (12 files verbatim + 2 label-definition records) |
| 5 | Duplicate report | `reports/duplicate_report.md` · `.json` |
| 6 | Quality-control report | `reports/quality_control_report.md` · `.json` |
| 7 | Download failure report | `reports/download_failure_report.md` · `.csv` |
| 8 | Dataset statistics | `reports/dataset_statistics.md` |
| 9 | Reproducible collection scripts | `scripts/` (+ `run_pipeline.sh`, `requirements.txt`) |
| 10 | README | this file |
| — | Progress tracker | `reports/progress_tracker.md` · `.json` |
| — | **Coverage reconciliation** | `reports/coverage_reconciliation.md` |

`images.csv` has exactly the 18 specified columns, in order. Extra provenance (blur score, HTTP
status, quality state, per-file origin URL, redistribution position) lives in
`images_extended.csv` so the requested schema stays clean.

### What the annotation files actually contain

Neither source ships category labels, and none were invented. But reading the preserved files
turned up real ground truth and real provenance, transcribed into
`annotations/original/*/LABEL_DEFINITIONS.md`:

**OpenCV** — `stereo_calib.xml` is an `<imagelist>` pairing `left01.jpg`↔`right01.jpg` …
`left14.jpg`↔`right04.jpg`. That is ground truth establishing the `left*`/`right*` files are
**stereo pairs of the same calibration board — distinct samples, not duplicates of each other**.
This independently confirms the near-duplicate policy in §6: had near-duplicates been
auto-removed, this calibration set would have been destroyed. `H1to3p.xml` carries a 3×3 homography
for the `pic1`→`pic3` correspondence; `calibration.yml` / `intrinsics.yml` / `left_intrinsics.yml`
carry camera intrinsics; `aloeGT.png` is a disparity ground-truth map. `letter-recognition.data`
is 20,000 rows of the UCI Letter Recognition dataset (letter + 16 numeric features) — tabular data
that does **not** label any image here and must not be joined to one.

**Pillow** — `Tests/images/bmp/README.txt` states verbatim that those images come from
**bmpsuite** (`github.com/jsummers/bmpsuite`) and are *"in the public domain according to the
readme in the project."* That is third-party provenance inside an approved source: cite bmpsuite
alongside Pillow for that subset. `Tests/images/tga/common/readme.txt` documents a structured
naming convention (`{width}x{height}_{mode}_{origin}_{compression}.tga`) — filenames there are
parseable metadata, a genuine non-invented source of attributes.

---

## 8. Reproducibility

```bash
cd research_dataset/scripts
pip install -r requirements.txt

./run_pipeline.sh              # full run
./run_pipeline.sh --dry-run    # assess + enumerate only; downloads nothing
./run_pipeline.sh --qc-only    # re-run QC/metadata/reports over existing raw_images/

python3 tests/test_qc.py       # 65-check validation suite, no pytest needed
```

Stages run in a fixed order and each refuses to proceed on an unapproved source, so the pipeline
cannot be coerced into collecting unlicensed images by reordering steps:

```
assess_source.py  →  tests/test_qc.py  →  collect.py  →  annotations.py
                                                        →  qc.py
                                                        →  build_metadata.py
                                                        →  reports.py
```

Environment: Python 3.11, Pillow 13.0, NumPy 2.4.6, imagehash 4.3.2, OpenCV 5.0.0, requests 2.34.2.

Bulk image payloads are git-ignored (see `.gitignore`) because they are large and fully
regenerable from the rights-approved manifests. Scripts, metadata, reports and annotations are
tracked — those cannot be regenerated once upstream sources change.

### Access policy enforced in code

- **robots.txt is honoured and fails closed.** If it cannot be read, the URL is refused rather than
  assumed permitted. The matcher implements REP wildcards directly, because Python's
  `urllib.robotparser` percent-encodes `*` to `%2A` and silently ignores wildcard `Disallow:`
  rules — an under-blocking bug that would have let `pypi.org/pypi/*/json` through. This was found
  by the test suite, not assumed.
- **No authentication, paywall, CAPTCHA or access control is bypassed.** HTTP 401/403 are recorded
  as failures. Gated datasets are refused outright.
- **Rate limiting**: ≥1.0 s between requests per host (0.4 s for this run against the authenticated
  GitHub API, well inside its 5,000 req/hour budget), plus any `Crawl-delay` the host publishes.
  828 requests were issued sequentially.
- **Host allowlist**: only hosts named in an approved manifest are ever fetched.
- **Caps**: 60 MiB/file, 2 GiB/run, 5,000 files/source, 89.5 Mpx/image (checked from the header
  *before* decode, so a decompression bomb cannot exhaust memory).
- **TLS verification is never disabled.** The sandbox terminates TLS with a local CA, so the
  pipeline resolves a CA bundle that actually validates instead of setting `verify=False`.

---

## 9. Limitations — read before citing this dataset

1. **The content-safety objective is not covered by this run.** Every collection that would supply
   it is awaiting a data-use agreement you must sign personally, or was refused. What was collected
   is entirely **safe-for-work technical imagery**.
2. **The corpus is synthetic, not natural.** OpenCV samples and Pillow fixtures are calibration
   boards, gradients, logos, renderings and format edge cases. It validates the *pipeline*; it is
   not a substitute for a natural-image corpus for visual-category recognition. Add Open Images V7.
3. **No classification labels exist.** Neither source ships them, and none were invented.
   `annotation_status` is `none_available` for all 229 passing images.
4. **Only 229 of 817 images pass QC**, and only 76 of those come from a photographic source.
   Plan for a much larger approved corpus before any modelling.
5. **Image counts for gated sources are publisher-stated**, not independently enumerated — they
   could not be verified without access.
6. **Assessment reflects sources as of 2026-10-27.** Licences change; re-run `assess_source.py`
   before any redistribution.
7. **Attribution is required** by both collected sources. Citations are in
   `metadata/sources_registry.csv`.
8. **Apache-2.0 §6 grants no trademark licence.** The logo files (`LinuxLogo.jpg`,
   `WindowsLogo.jpg`, `opencv-logo*.png`) may be analysed locally but must not be used in a way
   implying endorsement.

---

## 10. Recommended next steps

1. **Accept the UnsafeBench DUA** — the single highest-value action for your content-safety
   objective. Then run `python3 collect.py --slug unsafebench` on a network that can reach
   Hugging Face.
2. **Run this pipeline on your own network** to pick up Open Images V7 and KonIQ-10k, which are
   already approved and only blocked by sandbox egress.
3. **Get institutional ethics sign-off** before touching any explicit-content corpus, and confirm
   your university's data-handling rules for such material.
4. **Work through `annotations/derived/human_review_queue.csv`** (153 groups) to resolve the
   near-duplicate ambiguities.
5. **Do not pursue pornpics.de or the EBazarov URL corpus** by another route. The lawful
   alternatives above serve the same research question.
