# Coverage reconciliation

_Generated 2026-10-27T10:24:45Z_

This is the report that answers "did you get everything?". The five numbers below
are **not** interchangeable and must not be collapsed into one.

| # | Measure | Count | Basis |
|---|---|---:|---|
| 1 | Images **listed by the sources** (all 13 collections, incl. rejected) | 4,010,407 | publisher-stated counts in the registry |
| 2 | Images listed by **approved** collections only | 1,910,902 | registry |
| 3 | Images listed by collections that are approved **and reachable from this environment** | 829 | registry |
| 4 | Files actually **enumerated at the source** during this run | 829 | file_manifest.jsonl |
| 5 | Images **legally eligible** after per-file consent/provenance exclusions | 826 | manifest minus exclusions |
| 6 | Images **successfully downloaded** | 817 | download_log.jsonl |
| 7 | Images that then **passed quality control** | 229 | qc_records.jsonl |

## Exclusions, and why

| Source | File | Reason |
|---|---|---|
| opencv-samples-data | `lena.jpg` | CONSENT / PROVENANCE. lena.jpg is the 1972 Playboy centrefold crop; the depicted person (Lena Soderberg) has publicly stated she does not want the image used, and multiple venues (IEEE, Nature journals) have retired it. lena_tmpl.jpg is a crop of the same work. messi5.jpg is a press photograph of an |
| opencv-samples-data | `lena_tmpl.jpg` | CONSENT / PROVENANCE. lena.jpg is the 1972 Playboy centrefold crop; the depicted person (Lena Soderberg) has publicly stated she does not want the image used, and multiple venues (IEEE, Nature journals) have retired it. lena_tmpl.jpg is a crop of the same work. messi5.jpg is a press photograph of an |
| opencv-samples-data | `messi5.jpg` | CONSENT / PROVENANCE. lena.jpg is the 1972 Playboy centrefold crop; the depicted person (Lena Soderberg) has publicly stated she does not want the image used, and multiple venues (IEEE, Nature journals) have retired it. lena_tmpl.jpg is a crop of the same work. messi5.jpg is a press photograph of an |

## Collections not collected, and why

| Collection | Rights status | Estimated images | Blocking reason |
|---|---|---:|---|
| scikit-image-data | awaiting_permission | 28 | license_grants_research_and_ml_training: permissive=False research_only=False explicit_grant=None; redistribution_position_stated: redistribution_permitted=None (must be true/false, not null) |
| unsafebench | awaiting_permission | 10,146 | derivative_works_position_stated: derivative_works_permitted=None; access_method_self_service: access_method='hf_gated_dataset' requires gated approval or author correspondence that the researcher must complete personally |
| usd-unsafe-scene-detection | awaiting_permission | not stated | access_method_self_service: access_method='hf_gated_dataset' requires gated approval or author correspondence that the researcher must complete personally; requires_registration: registration/DUA not completed - the researcher must accept the terms personally; this pipeline will never do so on their |
| lspd | awaiting_permission | 500,000 | license_url_recorded: <missing>; derivative_works_position_stated: derivative_works_permitted=None |
| deepghs-nsfw-detect | awaiting_permission | not stated | license_grants_research_and_ml_training: permissive=False research_only=False explicit_grant=None; redistribution_position_stated: redistribution_permitted=None (must be true/false, not null) |
| cloverxion-image-moderation | awaiting_permission | not stated | derivative_works_position_stated: derivative_works_permitted=None; provenance_unclear: original author/rights chain cannot be established |
| c4censor | awaiting_permission | not stated | license_grants_research_and_ml_training: permissive=False research_only=False explicit_grant=None; license_url_recorded: <missing> |
| ebazarov-nsfw-urls | rejected | 1,589,331 | content_class_not_excluded: content_class='adult-explicit-scrape'; terms_of_service_prohibit_scraping: site ToS forbids automated collection |
| open-images-v7 | approved | 1,900,000 | approved but unreachable from this sandbox's egress allowlist |
| koniq-10k | approved | 10,073 | approved but unreachable from this sandbox's egress allowlist |
| pornpics-de | rejected | not stated | content_class_not_excluded: content_class='adult-explicit-scrape'; license_identified: license=<missing> |

## Statement of completeness

- Of the 829 images in approved-and-reachable collections, 829 were enumerated and 817 were downloaded.
- 3 files were deliberately withheld on consent/provenance grounds.
- 0 downloads failed.
- **No claim is made about the 4,009,578 images in collections that are rejected or awaiting permission or unreachable.** Those were not collected.

The content-safety arm of the research objective is therefore **not** covered by this
run: every collection that would supply it is either awaiting a data-use agreement the
researcher must sign personally, or was refused outright. See `README.md`.
