# Duplicate report

_Generated 2026-10-27T10:24:45Z_

## Method

- **Exact duplicates:** SHA-256 over full file bytes; first occurrence canonical
- **Near duplicates:** pHash(8x8=64-bit) with 4x16-bit LSH banding, confirmed by Hamming distance <= 6

## Totals

| Metric | Count |
|---|---:|
| Exact duplicate files (total) | 9 |
| &nbsp;&nbsp;caught at download time (bytes never re-fetched) | 9 |
| &nbsp;&nbsp;caught by QC over files on disk | 0 |
| Exact duplicate groups on disk | 0 |
| Near duplicate pairs | 1,689 |

> Duplicate and near-duplicate files are **copied** to `duplicate_images/`.
> The originals remain untouched in `raw_images/`. Nothing was deleted.

## Perceptual-hash reliability

A pHash is only informative when the image has enough structure for its DCT to
discriminate. Flat, solid-colour and near-uniform images collapse onto a handful of
degenerate hashes and would otherwise generate a combinatorial explosion of **false**
near-duplicate pairs. Such images are excluded from near-duplicate pairing and flagged
`phash_reliable=false`; they are still retained in the corpus, and exact SHA-256
deduplication still applies to them.

| Measure | Count |
|---|---:|
| pHash reliable (used for near-duplicate detection) | 305 |
| pHash unreliable (excluded from near-duplicate pairing) | 461 |


## Near-duplicate pairs

| Image | Near-duplicate of | Hamming distance |
|---|---|---:|
| opencv-samples-data-000014 | opencv-samples-data-000013 | 2 |
| opencv-samples-data-000050 | opencv-samples-data-000047 | 4 |
| opencv-samples-data-000071 | opencv-samples-data-000070 | 6 |
| opencv-samples-data-000082 | opencv-samples-data-000081 | 2 |
| pillow-test-images-000095 | pillow-test-images-000094 | 0 |
| pillow-test-images-000169 | pillow-test-images-000106 | 0 |
| pillow-test-images-000173 | pillow-test-images-000168 | 0 |
| pillow-test-images-000175 | pillow-test-images-000174 | 0 |
| pillow-test-images-000176 | pillow-test-images-000106 | 6 |
| pillow-test-images-000176 | pillow-test-images-000169 | 6 |
| pillow-test-images-000177 | pillow-test-images-000176 | 0 |
| pillow-test-images-000177 | pillow-test-images-000106 | 6 |
| pillow-test-images-000177 | pillow-test-images-000169 | 6 |
| pillow-test-images-000178 | pillow-test-images-000106 | 0 |
| pillow-test-images-000178 | pillow-test-images-000169 | 0 |
| pillow-test-images-000178 | pillow-test-images-000176 | 6 |
| pillow-test-images-000178 | pillow-test-images-000177 | 6 |
| pillow-test-images-000189 | pillow-test-images-000188 | 2 |
| pillow-test-images-000214 | pillow-test-images-000213 | 0 |
| pillow-test-images-000215 | pillow-test-images-000208 | 0 |
| pillow-test-images-000216 | pillow-test-images-000208 | 0 |
| pillow-test-images-000216 | pillow-test-images-000215 | 0 |
| pillow-test-images-000217 | pillow-test-images-000208 | 4 |
| pillow-test-images-000217 | pillow-test-images-000215 | 4 |
| pillow-test-images-000217 | pillow-test-images-000216 | 4 |
| pillow-test-images-000218 | pillow-test-images-000208 | 0 |
| pillow-test-images-000218 | pillow-test-images-000215 | 0 |
| pillow-test-images-000218 | pillow-test-images-000216 | 0 |
| pillow-test-images-000218 | pillow-test-images-000217 | 4 |
| pillow-test-images-000219 | pillow-test-images-000208 | 0 |
| pillow-test-images-000219 | pillow-test-images-000215 | 0 |
| pillow-test-images-000219 | pillow-test-images-000216 | 0 |
| pillow-test-images-000219 | pillow-test-images-000218 | 0 |
| pillow-test-images-000219 | pillow-test-images-000217 | 4 |
| pillow-test-images-000220 | pillow-test-images-000208 | 0 |
| pillow-test-images-000220 | pillow-test-images-000215 | 0 |
| pillow-test-images-000220 | pillow-test-images-000216 | 0 |
| pillow-test-images-000220 | pillow-test-images-000218 | 0 |
| pillow-test-images-000220 | pillow-test-images-000219 | 0 |
| pillow-test-images-000220 | pillow-test-images-000217 | 4 |
| pillow-test-images-000221 | pillow-test-images-000208 | 0 |
| pillow-test-images-000221 | pillow-test-images-000215 | 0 |
| pillow-test-images-000221 | pillow-test-images-000216 | 0 |
| pillow-test-images-000221 | pillow-test-images-000218 | 0 |
| pillow-test-images-000221 | pillow-test-images-000219 | 0 |
| pillow-test-images-000221 | pillow-test-images-000220 | 0 |
| pillow-test-images-000221 | pillow-test-images-000217 | 4 |
| pillow-test-images-000222 | pillow-test-images-000208 | 0 |
| pillow-test-images-000222 | pillow-test-images-000215 | 0 |
| pillow-test-images-000222 | pillow-test-images-000216 | 0 |
| pillow-test-images-000222 | pillow-test-images-000218 | 0 |
| pillow-test-images-000222 | pillow-test-images-000219 | 0 |
| pillow-test-images-000222 | pillow-test-images-000220 | 0 |
| pillow-test-images-000222 | pillow-test-images-000221 | 0 |
| pillow-test-images-000222 | pillow-test-images-000217 | 4 |
| pillow-test-images-000223 | pillow-test-images-000208 | 4 |
| pillow-test-images-000223 | pillow-test-images-000215 | 4 |
| pillow-test-images-000223 | pillow-test-images-000216 | 4 |
| pillow-test-images-000223 | pillow-test-images-000218 | 4 |
| pillow-test-images-000223 | pillow-test-images-000219 | 4 |
| pillow-test-images-000223 | pillow-test-images-000220 | 4 |
| pillow-test-images-000223 | pillow-test-images-000221 | 4 |
| pillow-test-images-000223 | pillow-test-images-000222 | 4 |
| pillow-test-images-000224 | pillow-test-images-000208 | 2 |
| pillow-test-images-000224 | pillow-test-images-000215 | 2 |
| pillow-test-images-000224 | pillow-test-images-000216 | 2 |
| pillow-test-images-000224 | pillow-test-images-000218 | 2 |
| pillow-test-images-000224 | pillow-test-images-000219 | 2 |
| pillow-test-images-000224 | pillow-test-images-000220 | 2 |
| pillow-test-images-000224 | pillow-test-images-000221 | 2 |
| pillow-test-images-000224 | pillow-test-images-000222 | 2 |
| pillow-test-images-000224 | pillow-test-images-000223 | 2 |
| pillow-test-images-000225 | pillow-test-images-000224 | 0 |
| pillow-test-images-000225 | pillow-test-images-000208 | 2 |
| pillow-test-images-000225 | pillow-test-images-000215 | 2 |
| pillow-test-images-000225 | pillow-test-images-000216 | 2 |
| pillow-test-images-000225 | pillow-test-images-000218 | 2 |
| pillow-test-images-000225 | pillow-test-images-000219 | 2 |
| pillow-test-images-000225 | pillow-test-images-000220 | 2 |
| pillow-test-images-000225 | pillow-test-images-000221 | 2 |
| pillow-test-images-000225 | pillow-test-images-000222 | 2 |
| pillow-test-images-000225 | pillow-test-images-000223 | 2 |
| pillow-test-images-000226 | pillow-test-images-000208 | 2 |
| pillow-test-images-000226 | pillow-test-images-000215 | 2 |
| pillow-test-images-000226 | pillow-test-images-000216 | 2 |
| pillow-test-images-000226 | pillow-test-images-000218 | 2 |
| pillow-test-images-000226 | pillow-test-images-000219 | 2 |
| pillow-test-images-000226 | pillow-test-images-000220 | 2 |
| pillow-test-images-000226 | pillow-test-images-000221 | 2 |
| pillow-test-images-000226 | pillow-test-images-000222 | 2 |
| pillow-test-images-000226 | pillow-test-images-000224 | 2 |
| pillow-test-images-000226 | pillow-test-images-000225 | 2 |
| pillow-test-images-000226 | pillow-test-images-000223 | 4 |
| pillow-test-images-000226 | pillow-test-images-000217 | 4 |
| pillow-test-images-000227 | pillow-test-images-000226 | 0 |
| pillow-test-images-000227 | pillow-test-images-000208 | 2 |
| pillow-test-images-000227 | pillow-test-images-000215 | 2 |
| pillow-test-images-000227 | pillow-test-images-000216 | 2 |
| pillow-test-images-000227 | pillow-test-images-000218 | 2 |
| pillow-test-images-000227 | pillow-test-images-000219 | 2 |
| pillow-test-images-000227 | pillow-test-images-000220 | 2 |
| pillow-test-images-000227 | pillow-test-images-000221 | 2 |
| pillow-test-images-000227 | pillow-test-images-000222 | 2 |
| pillow-test-images-000227 | pillow-test-images-000224 | 2 |
| pillow-test-images-000227 | pillow-test-images-000225 | 2 |
| pillow-test-images-000227 | pillow-test-images-000223 | 4 |
| pillow-test-images-000227 | pillow-test-images-000217 | 4 |
| pillow-test-images-000228 | pillow-test-images-000226 | 0 |
| pillow-test-images-000228 | pillow-test-images-000227 | 0 |
| pillow-test-images-000228 | pillow-test-images-000208 | 2 |
| pillow-test-images-000228 | pillow-test-images-000215 | 2 |
| pillow-test-images-000228 | pillow-test-images-000216 | 2 |
| pillow-test-images-000228 | pillow-test-images-000218 | 2 |
| pillow-test-images-000228 | pillow-test-images-000219 | 2 |
| pillow-test-images-000228 | pillow-test-images-000220 | 2 |
| pillow-test-images-000228 | pillow-test-images-000221 | 2 |
| pillow-test-images-000228 | pillow-test-images-000222 | 2 |
| pillow-test-images-000228 | pillow-test-images-000224 | 2 |
| pillow-test-images-000228 | pillow-test-images-000225 | 2 |
| pillow-test-images-000228 | pillow-test-images-000223 | 4 |
| pillow-test-images-000228 | pillow-test-images-000217 | 4 |
| pillow-test-images-000229 | pillow-test-images-000226 | 2 |
| pillow-test-images-000229 | pillow-test-images-000227 | 2 |
| pillow-test-images-000229 | pillow-test-images-000228 | 2 |
| pillow-test-images-000229 | pillow-test-images-000208 | 4 |
| pillow-test-images-000229 | pillow-test-images-000215 | 4 |
| pillow-test-images-000229 | pillow-test-images-000216 | 4 |
| pillow-test-images-000229 | pillow-test-images-000218 | 4 |
| pillow-test-images-000229 | pillow-test-images-000219 | 4 |
| pillow-test-images-000229 | pillow-test-images-000220 | 4 |
| pillow-test-images-000229 | pillow-test-images-000221 | 4 |
| pillow-test-images-000229 | pillow-test-images-000222 | 4 |
| pillow-test-images-000229 | pillow-test-images-000224 | 4 |
| pillow-test-images-000229 | pillow-test-images-000225 | 4 |
| pillow-test-images-000229 | pillow-test-images-000223 | 6 |
| pillow-test-images-000230 | pillow-test-images-000229 | 0 |
| pillow-test-images-000230 | pillow-test-images-000226 | 2 |
| pillow-test-images-000230 | pillow-test-images-000227 | 2 |
| pillow-test-images-000230 | pillow-test-images-000228 | 2 |
| pillow-test-images-000230 | pillow-test-images-000208 | 4 |
| pillow-test-images-000230 | pillow-test-images-000215 | 4 |
| pillow-test-images-000230 | pillow-test-images-000216 | 4 |
| pillow-test-images-000230 | pillow-test-images-000218 | 4 |
| pillow-test-images-000230 | pillow-test-images-000219 | 4 |
| pillow-test-images-000230 | pillow-test-images-000220 | 4 |
| pillow-test-images-000230 | pillow-test-images-000221 | 4 |
| pillow-test-images-000230 | pillow-test-images-000222 | 4 |
| pillow-test-images-000230 | pillow-test-images-000224 | 4 |
| pillow-test-images-000230 | pillow-test-images-000225 | 4 |
| pillow-test-images-000230 | pillow-test-images-000223 | 6 |
| pillow-test-images-000231 | pillow-test-images-000229 | 0 |
| pillow-test-images-000231 | pillow-test-images-000230 | 0 |
| pillow-test-images-000231 | pillow-test-images-000226 | 2 |
| pillow-test-images-000231 | pillow-test-images-000227 | 2 |
| pillow-test-images-000231 | pillow-test-images-000228 | 2 |
| pillow-test-images-000231 | pillow-test-images-000208 | 4 |
| pillow-test-images-000231 | pillow-test-images-000215 | 4 |
| pillow-test-images-000231 | pillow-test-images-000216 | 4 |
| pillow-test-images-000231 | pillow-test-images-000218 | 4 |
| pillow-test-images-000231 | pillow-test-images-000219 | 4 |
| pillow-test-images-000231 | pillow-test-images-000220 | 4 |
| pillow-test-images-000231 | pillow-test-images-000221 | 4 |
| pillow-test-images-000231 | pillow-test-images-000222 | 4 |
| pillow-test-images-000231 | pillow-test-images-000224 | 4 |
| pillow-test-images-000231 | pillow-test-images-000225 | 4 |
| pillow-test-images-000231 | pillow-test-images-000223 | 6 |
| pillow-test-images-000235 | pillow-test-images-000213 | 0 |
| pillow-test-images-000235 | pillow-test-images-000214 | 0 |
| pillow-test-images-000236 | pillow-test-images-000226 | 0 |
| pillow-test-images-000236 | pillow-test-images-000227 | 0 |
| pillow-test-images-000236 | pillow-test-images-000228 | 0 |
| pillow-test-images-000236 | pillow-test-images-000208 | 2 |
| pillow-test-images-000236 | pillow-test-images-000215 | 2 |
| pillow-test-images-000236 | pillow-test-images-000216 | 2 |
| pillow-test-images-000236 | pillow-test-images-000218 | 2 |
| pillow-test-images-000236 | pillow-test-images-000219 | 2 |
| pillow-test-images-000236 | pillow-test-images-000220 | 2 |
| pillow-test-images-000236 | pillow-test-images-000221 | 2 |
| pillow-test-images-000236 | pillow-test-images-000222 | 2 |
| pillow-test-images-000236 | pillow-test-images-000224 | 2 |
| pillow-test-images-000236 | pillow-test-images-000225 | 2 |
| pillow-test-images-000236 | pillow-test-images-000229 | 2 |
| pillow-test-images-000236 | pillow-test-images-000230 | 2 |
| pillow-test-images-000236 | pillow-test-images-000231 | 2 |
| pillow-test-images-000236 | pillow-test-images-000223 | 4 |
| pillow-test-images-000236 | pillow-test-images-000217 | 4 |
| pillow-test-images-000237 | pillow-test-images-000217 | 0 |
| pillow-test-images-000237 | pillow-test-images-000226 | 4 |
| pillow-test-images-000237 | pillow-test-images-000227 | 4 |
| pillow-test-images-000237 | pillow-test-images-000228 | 4 |
| pillow-test-images-000237 | pillow-test-images-000236 | 4 |
| pillow-test-images-000237 | pillow-test-images-000208 | 4 |
| pillow-test-images-000237 | pillow-test-images-000215 | 4 |
| pillow-test-images-000237 | pillow-test-images-000216 | 4 |
| pillow-test-images-000237 | pillow-test-images-000218 | 4 |
| pillow-test-images-000237 | pillow-test-images-000219 | 4 |
| pillow-test-images-000237 | pillow-test-images-000220 | 4 |
| pillow-test-images-000237 | pillow-test-images-000221 | 4 |
| pillow-test-images-000237 | pillow-test-images-000222 | 4 |
| pillow-test-images-000238 | pillow-test-images-000223 | 0 |
| pillow-test-images-000238 | pillow-test-images-000224 | 2 |
| pillow-test-images-000238 | pillow-test-images-000225 | 2 |
| pillow-test-images-000238 | pillow-test-images-000208 | 4 |
| pillow-test-images-000238 | pillow-test-images-000215 | 4 |
| pillow-test-images-000238 | pillow-test-images-000216 | 4 |
| pillow-test-images-000238 | pillow-test-images-000218 | 4 |
| pillow-test-images-000238 | pillow-test-images-000219 | 4 |
| pillow-test-images-000238 | pillow-test-images-000220 | 4 |
| pillow-test-images-000238 | pillow-test-images-000221 | 4 |
| pillow-test-images-000238 | pillow-test-images-000222 | 4 |
| pillow-test-images-000238 | pillow-test-images-000226 | 4 |
| pillow-test-images-000238 | pillow-test-images-000227 | 4 |
| pillow-test-images-000238 | pillow-test-images-000228 | 4 |
| pillow-test-images-000238 | pillow-test-images-000236 | 4 |
| pillow-test-images-000238 | pillow-test-images-000229 | 6 |
| pillow-test-images-000238 | pillow-test-images-000230 | 6 |
| pillow-test-images-000238 | pillow-test-images-000231 | 6 |
| pillow-test-images-000239 | pillow-test-images-000224 | 0 |
| pillow-test-images-000239 | pillow-test-images-000225 | 0 |
| pillow-test-images-000239 | pillow-test-images-000208 | 2 |
| pillow-test-images-000239 | pillow-test-images-000215 | 2 |
| pillow-test-images-000239 | pillow-test-images-000216 | 2 |
| pillow-test-images-000239 | pillow-test-images-000218 | 2 |
| pillow-test-images-000239 | pillow-test-images-000219 | 2 |
| pillow-test-images-000239 | pillow-test-images-000220 | 2 |
| pillow-test-images-000239 | pillow-test-images-000221 | 2 |
| pillow-test-images-000239 | pillow-test-images-000222 | 2 |
| pillow-test-images-000239 | pillow-test-images-000223 | 2 |
| pillow-test-images-000239 | pillow-test-images-000226 | 2 |
| pillow-test-images-000239 | pillow-test-images-000227 | 2 |
| pillow-test-images-000239 | pillow-test-images-000228 | 2 |
| pillow-test-images-000239 | pillow-test-images-000236 | 2 |
| pillow-test-images-000239 | pillow-test-images-000238 | 2 |
| pillow-test-images-000239 | pillow-test-images-000229 | 4 |
| pillow-test-images-000239 | pillow-test-images-000230 | 4 |
| pillow-test-images-000239 | pillow-test-images-000231 | 4 |
| pillow-test-images-000240 | pillow-test-images-000224 | 0 |
| pillow-test-images-000240 | pillow-test-images-000225 | 0 |
| pillow-test-images-000240 | pillow-test-images-000239 | 0 |
| pillow-test-images-000240 | pillow-test-images-000208 | 2 |
| pillow-test-images-000240 | pillow-test-images-000215 | 2 |
| pillow-test-images-000240 | pillow-test-images-000216 | 2 |
| pillow-test-images-000240 | pillow-test-images-000218 | 2 |
| pillow-test-images-000240 | pillow-test-images-000219 | 2 |
| pillow-test-images-000240 | pillow-test-images-000220 | 2 |
| pillow-test-images-000240 | pillow-test-images-000221 | 2 |
| pillow-test-images-000240 | pillow-test-images-000222 | 2 |
| pillow-test-images-000240 | pillow-test-images-000223 | 2 |
| pillow-test-images-000240 | pillow-test-images-000226 | 2 |
| pillow-test-images-000240 | pillow-test-images-000227 | 2 |
| pillow-test-images-000240 | pillow-test-images-000228 | 2 |
| pillow-test-images-000240 | pillow-test-images-000236 | 2 |
| pillow-test-images-000240 | pillow-test-images-000238 | 2 |
| pillow-test-images-000240 | pillow-test-images-000229 | 4 |
| pillow-test-images-000240 | pillow-test-images-000230 | 4 |
| pillow-test-images-000240 | pillow-test-images-000231 | 4 |
| pillow-test-images-000241 | pillow-test-images-000226 | 0 |
| pillow-test-images-000241 | pillow-test-images-000227 | 0 |
| pillow-test-images-000241 | pillow-test-images-000228 | 0 |
| pillow-test-images-000241 | pillow-test-images-000236 | 0 |
| pillow-test-images-000241 | pillow-test-images-000208 | 2 |
| pillow-test-images-000241 | pillow-test-images-000215 | 2 |
| pillow-test-images-000241 | pillow-test-images-000216 | 2 |
| pillow-test-images-000241 | pillow-test-images-000218 | 2 |
| pillow-test-images-000241 | pillow-test-images-000219 | 2 |
| pillow-test-images-000241 | pillow-test-images-000220 | 2 |
| pillow-test-images-000241 | pillow-test-images-000221 | 2 |
| pillow-test-images-000241 | pillow-test-images-000222 | 2 |
| pillow-test-images-000241 | pillow-test-images-000224 | 2 |
| pillow-test-images-000241 | pillow-test-images-000225 | 2 |
| pillow-test-images-000241 | pillow-test-images-000239 | 2 |
| pillow-test-images-000241 | pillow-test-images-000240 | 2 |
| pillow-test-images-000241 | pillow-test-images-000229 | 2 |
| pillow-test-images-000241 | pillow-test-images-000230 | 2 |
| pillow-test-images-000241 | pillow-test-images-000231 | 2 |
| pillow-test-images-000241 | pillow-test-images-000223 | 4 |
| pillow-test-images-000241 | pillow-test-images-000238 | 4 |
| pillow-test-images-000241 | pillow-test-images-000217 | 4 |
| pillow-test-images-000241 | pillow-test-images-000237 | 4 |
| pillow-test-images-000242 | pillow-test-images-000226 | 0 |
| pillow-test-images-000242 | pillow-test-images-000227 | 0 |
| pillow-test-images-000242 | pillow-test-images-000228 | 0 |
| pillow-test-images-000242 | pillow-test-images-000236 | 0 |
| pillow-test-images-000242 | pillow-test-images-000241 | 0 |
| pillow-test-images-000242 | pillow-test-images-000208 | 2 |
| pillow-test-images-000242 | pillow-test-images-000215 | 2 |
| pillow-test-images-000242 | pillow-test-images-000216 | 2 |
| pillow-test-images-000242 | pillow-test-images-000218 | 2 |
| pillow-test-images-000242 | pillow-test-images-000219 | 2 |
| pillow-test-images-000242 | pillow-test-images-000220 | 2 |
| pillow-test-images-000242 | pillow-test-images-000221 | 2 |
| pillow-test-images-000242 | pillow-test-images-000222 | 2 |
| pillow-test-images-000242 | pillow-test-images-000224 | 2 |
| pillow-test-images-000242 | pillow-test-images-000225 | 2 |
| pillow-test-images-000242 | pillow-test-images-000239 | 2 |
| pillow-test-images-000242 | pillow-test-images-000240 | 2 |
| pillow-test-images-000242 | pillow-test-images-000229 | 2 |
| pillow-test-images-000242 | pillow-test-images-000230 | 2 |
| pillow-test-images-000242 | pillow-test-images-000231 | 2 |
| pillow-test-images-000242 | pillow-test-images-000223 | 4 |
