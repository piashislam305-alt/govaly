# Quality-control report

_Generated 2026-10-27T10:24:45Z_

## Thresholds applied

| Parameter | Value |
|---|---|
| MIN_WIDTH | 64 |
| MIN_HEIGHT | 64 |
| MIN_FILE_BYTES | 1024 |
| BLUR_LAPVAR_THRESHOLD | 40.0 |
| PHASH_NEAR_DUP_DISTANCE | 6 |
| ACCEPTED_FORMATS | ['BMP', 'GIF', 'JPEG', 'PNG', 'TIFF', 'WEBP'] |
| MAX_IMAGE_PIXELS | 89478485 |

## Outcome

| State | Count |
|---|---:|
| passed | 229 |
| rejected | 524 |
| duplicates | 0 |
| flagged | 64 |
| **files inspected** | **817** |

## Rejection reasons

| Reason | Count |
|---|---:|
| too_small_file | 242 |
| blurry | 162 |
| low_resolution | 53 |
| corrupt | 46 |
| unsupported_format | 16 |
| excessive_pixels | 5 |

## Formats

| Format | Count |
|---|---:|
| PNG | 435 |
| JPEG | 112 |
| TIFF | 98 |
| BMP | 54 |
| GIF | 37 |
| WEBP | 14 |
| ICO | 8 |
| PPM | 5 |
| PCX | 3 |

## Dimension and quality statistics

| Measure | Count | Min | p05 | Median | Mean | p95 | Max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Width (px) | 766 | 1 | 10 | 128.0 | 276.1 | 640 | 4,160 |
| Height (px) | 766 | 1 | 10 | 100.0 | 208.28 | 512 | 4,677 |
| File size (bytes) | 817 | 16 | 168 | 3,686 | 40026.08 | 178,480 | 4,147,841 |
| Blur: Laplacian variance | 766 | 0.0 | 0.0 | 23.29 | 572.32 | 2286.746544445528 | 36235.34839394316 |

Aspect ratio: min 0.2, median 1.0, max 25.6

## Megapixel distribution

| Bucket | Count |
|---|---:|
| 0-0.1 MP | 576 |
| 0.1-0.5 MP | 167 |
| 0.5-1 MP | 9 |
| 1-2 MP | 3 |
| 10-50 MP | 1 |
| 2-5 MP | 9 |
| 5-10 MP | 1 |

## Note on interpretation

The Laplacian-variance blur score is a **triage heuristic**, not a ground-truth
image-quality label. It is resolution- and content-dependent: a genuinely sharp
image of a smooth, low-texture subject scores low, and a noisy or heavily
compressed image can score high. For publishable image-quality assessment,
pair it with a human-rated benchmark such as KonIQ-10k (see the source registry),
which ships crowdsourced mean opinion scores.

Rejected files are **copied** to `rejected_images/<reason>/<source>/` with the
reason recorded in `metadata/rejected_manifest.csv`. Originals are never deleted.
