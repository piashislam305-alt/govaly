# Dataset statistics

_Generated 2026-10-27T10:24:45Z_

## Layout

```
research_dataset/
  raw_images/          817 files (31.2 MB) - byte-exact originals
  processed_images/    293 files (9.4 MB) - normalised copies
  duplicate_images/    0 files - copies routed out of the working set
  rejected_images/     524 files - copies + reasons, never deleted
  annotations/         16 files
  metadata/            25 files
  reports/             11 files
```

## Rows in images.csv

829 total

### download_status

| Value | Count |
|---|---:|
| `success` | 808 |
| `success_unverified_format` | 9 |
| `skipped_already_present` | 9 |
| `excluded_by_source_manifest` | 3 |

### rights_review_status

| Value | Count |
|---|---:|
| `approved` | 829 |

### annotation_status

| Value | Count |
|---|---:|
| `not_applicable` | 600 |
| `none_available` | 229 |

### by source

| Source | Count |
|---|---:|
| Pillow test image corpus (Tests/images) | 735 |
| OpenCV sample image corpus (samples/data) | 94 |

## Quality state (from images_extended.csv)

| State | Count |
|---|---:|
| `rejected` | 524 |
| `pass` | 229 |
| `flagged` | 64 |
| `not_collected` | 12 |
