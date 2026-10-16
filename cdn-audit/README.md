# CDN resource audit — vixenbrand.com

Read-only inventory of every CDN-served resource reachable from
`https://vixenbrand.com/`, captured **2026-10-16**.

> **Why scripts and not just a download:** the Arena sandbox has no outbound
> network access to arbitrary hosts (only github.com / npm / pypi), so the bytes
> could not be pulled in here. Everything was enumerated through a read-only
> page fetcher instead, and `harvest.mjs` / `download.sh` are provided so you can
> mirror the actual files from your own machine in one command.

---

## 1. What the site is

| | |
|---|---|
| Platform | Shopify |
| Shop ID | `25182175331` |
| myshopify domain | `vixenlive.myshopify.com` |
| Storefront CDN host | `vixenbrand.com/cdn` (`Shopify.cdnHost`) |
| Theme | **"2026 - EDAN"**, id `143021539604` |
| Theme schema | **Turbo** `4.1.5.pre` (Out of the Sandbox) |
| Currency / country / locale | USD / US / en |
| Products online | 66 (per product sitemap) |
| Collections | 26 |
| Pages | 11 |

## 2. CDN architecture

Three distinct CDN surfaces are in play:

1. **`cdn.shopify.com/s/files/1/0251/8217/5331/…`** — the *canonical* upload store.
   Every image, at full resolution, with a `?v=<unix-ts>` cache buster. This is
   what `urls.txt` lists (99 assets), because it is the one URL per file that
   never changes shape.
2. **`vixenbrand.com/cdn/shop/…`** — the *storefront transform* edge. Same file,
   but Shopify resizes/recompresses/converts on demand and caches at the edge.
3. **`vixenbrand.com/cdn/shopifycloud/…`** — Shopify's own platform runtime
   (portable wallets, WebMCP, autosizes polyfill).

### The transform rules (this is the important part)

Any uploaded file can be requested at any size, in any format, at any crop. The
URL grammar is:

```
https://vixenbrand.com/cdn/shop/{path}_{width}x{height}_{crop}.{ext}?v={v}&quality={q}
```

| Param | Meaning | Example |
|---|---|---|
| `_{w}x` | resize to width, keep ratio | `…_800x.jpg` |
| `_{w}x{h}` | fit inside box | `…_800x1200.jpg` |
| `_crop_center` | with `_{w}x{h}`, crop to fill | `…_800x800_crop_center.jpg` |
| `.webp` / `.avif` | force a format by swapping the extension | `…_800x.webp` |
| `&quality=75` | JPEG/WebP quality 1–100 | |
| `?v=` | upload timestamp, cache-busting | |

Width ladder the Turbo theme actually emits (confirmed via the Wayback CDX
index, which shows the same slider cached at all 17 widths):

```
200 400 410 600 800 1000 1200 1400 1600 1800 2000 2500 3000 3500 4000 4500 5000
```

**Consequence:** "all CDN available resources" is not a finite set. The number of
*uploaded originals* is finite (~99 enumerated here, more once galleries are
expanded); the number of *valid URLs* is effectively unbounded, because any
width × height × format × crop combination of any original resolves 200 and is
generated on first request. `build-manifest.mjs` therefore normalises everything
back to the canonical original and records the observed variants separately.

## 3. Inventory

| Category | Count | Source |
|---|---|---|
| Product primary images | 66 | `sitemap_products_1.xml` |
| Product gallery images (expanded) | 7 | `products.json` |
| Product secondary/hover images | 14 | homepage HTML |
| Branding (logo) | 1 | homepage HTML |
| Hero + collection banners | 6 | homepage HTML |
| Historical/seasonal banners | 6 | Wayback CDX |
| Shopify platform scripts | 8 | homepage head |
| Installed-app scripts | 8 | homepage head |
| API / sitemap endpoints | 15 | discovery |
| URL templates (non-fetchable patterns) | 5 | discovery |
| **Unique URLs total** | **131** | |

### Files

| File | Contents |
|---|---|
| `manifest.json` | Everything, structured: shop/theme fingerprint, per-product canonical + `_800x` URLs + galleries, banners, scripts, endpoints, transform rules |
| `urls.txt` | 99 canonical media URLs, one per line — pipe straight into `wget -i` |
| `scripts.txt` | 12 concrete JS/CSS resources |
| `endpoints.txt` | 18 JSON/XML/MD endpoints |
| `assets.csv` | Flat table: `category,id,url,kind,version,source` |
| `data/products.json` | Raw captured product → image mapping (input to the build) |
| `data/site-assets.json` | Raw captured banners, scripts, endpoints, collections, pages |
| `build-manifest.mjs` | Regenerates all of the above from `data/` |
| `harvest.mjs` | **Exhaustive** live crawler (see §5) |
| `download.sh` | Mirrors `urls.txt` to `./mirror`, preserving CDN paths |

### Non-image CDN resources worth knowing about

Installed apps loading third-party JS into the storefront:

| App | Host |
|---|---|
| Booster EU Cookie Bar | `cdn.shopify.com/s/files/1/0277/0019/9517/t/1/assets/` |
| Snapchat SCE pixel | `intg.snapchat.com` |
| Route shipping protection | `shopify-widget.route.com` |
| Hextom Free Shipping Bar | `cdn.hextom.com` |
| Omnisend | `omnisnippet1.com` |
| Klarna On-Site Messaging | `s3.eu-west-1.amazonaws.com` |
| Pinterest tag (`2613542739109`) | `s.pinimg.com`, `ct.pinterest.com` |
| hCaptcha (`f06e6c50-…-21a2b65856fe`) | `cdn.shopify.com/shopifycloud/storefront-forms-hcaptcha/` |

Shopify platform runtime: `shop-js` module loaders (22 lazy features, 1 eager),
`portable-wallets.en.js`, `webmcp-f427de6a.js` (SRI
`sha256-ypGF+5vIq4Psw4WG7nsVtdd/TCfsJWnrNuACdqLCElY=`),
`autosizes-84416378.js`, and the `monorail-edge.shopifysvc.com/v1/produce`
analytics beacon. `lazysizes` v4.1.4/v4.1.5 is **inlined** in the head, not
served from a CDN.

Commerce/agent surface (this store is agent-ready):

- `/agents.md` — the store's own agent instructions. It **explicitly permits**
  read-only browsing of public HTML and discovery via `/sitemap.xml`, and asks
  agents to self-identify and back off on `429`.
- `/.well-known/ucp` — Universal Commerce Protocol profile, version
  `2026-08-25` (also `2026-04-08`, `2026-01-23`). Capabilities: cart, checkout,
  order, catalog search/lookup, discount, fulfillment, buyer consent, identity
  linking, permalink (`/buy`).
- `/api/ucp/mcp` and `/api/mcp` — MCP endpoints (`window.Shopify.MCP.enabled = true`).
- Payment handlers: Google Pay (merchant id `16708973830884969730`), Shopify
  card, Shop Pay.

## 4. Known coverage gaps

Being explicit about what this pass did **not** capture:

1. **Full product galleries.** The product sitemap publishes only one
   `image:loc` per product. Real galleries run 2–8 images (the 10th Anniversary
   One Piece has 7). Expanding all 66 products needs `/products.json`, which is
   ~63 pages of JSON — too large to pull through the sandbox's page fetcher
   without blowing the context budget. `harvest.mjs` does this properly.
2. **Theme CSS/JS/font filenames.** These live at
   `/cdn/shop/t/143021539604/assets/…` and are emitted in `<link>`/`<script>`
   tags *after* the ~30 KB inline currency-format blob in the head. The public
   CORS proxy used here truncates responses at ~77 KB, so the tags were cut off
   before they appeared. `harvest.mjs` reads the raw HTML directly and regexes
   them out.
3. **Blog/article images.** `sitemap_blogs_1.xml` and `sitemap_articles_1.xml`
   were located but not expanded.
4. **Deleted/unpublished uploads.** Shopify never deletes files, so unlinked
   assets still resolve. The Wayback CDX index is the only way to find them; six
   historical sliders were recovered that way and are flagged as such.

## 5. Getting everything

From a machine with normal internet access:

```bash
# Manifest only — every product gallery, theme asset, collection, page, blog
node cdn-audit/harvest.mjs --out cdn-audit/harvested

# Manifest + mirror every file to disk
node cdn-audit/harvest.mjs --download

# …and also grab 800px and 1600px resized variants
node cdn-audit/harvest.mjs --download --variants 800,1600

# Or just the 99 canonical originals already enumerated
bash cdn-audit/download.sh
WIDTH=800 bash cdn-audit/download.sh   # resized instead of full-res
```

`harvest.mjs` sends `User-Agent: govaly-cdn-audit/1.0 (+research; read-only
catalogue harvest)`, serialises requests with a 350 ms delay, and honours
`Retry-After` on `429` — matching what `/agents.md` asks for. It works against
any Shopify store: `--site https://other-store.com`.

## 6. Legal note

The URL inventory is factual and the store's own `agents.md` sanctions read-only
browsing of public catalogue data. The **images themselves are Vixen Brand's
copyrighted product photography**, and several feature identifiable performers —
so they carry both copyright and likeness/publicity rights.

Fine: auditing, caching, analysis, learning how a Turbo storefront structures
its CDN, and using the transform rules as a reference for govaly's own image
pipeline.

Not fine: rehosting these photos as govaly product imagery, or shipping them in
a public build. `client/public/img/` already holds govaly's own licensed assets —
keep it that way.
