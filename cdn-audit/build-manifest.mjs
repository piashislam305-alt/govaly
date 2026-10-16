#!/usr/bin/env node
/**
 * build-manifest.mjs
 * Turns the captured datasets in ./data into three consumable artifacts:
 *   - manifest.json  (everything, with URLs fully expanded)
 *   - urls.txt       (one canonical image URL per line -> feed to wget/curl/aria2)
 *   - assets.csv     (category,id,url,kind,version,source)
 *
 * Zero dependencies. Node 18+.
 *   node cdn-audit/build-manifest.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "data");

const products = JSON.parse(readFileSync(join(DATA, "products.json"), "utf8"));
const site = JSON.parse(readFileSync(join(DATA, "site-assets.json"), "utf8"));

const FILES_BASE = products._meta.shop_files_prefix; // https://cdn.shopify.com/s/files/1/0251/8217/5331/
const STORE_CDN = "https://vixenbrand.com/cdn/shop/";

const extOf = (p) => (p.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] ?? "jpg");
const stemOf = (p) => p.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
/** Canonical, full-resolution upload URL (no size suffix). */
const canonical = (path, v) => `${FILES_BASE}${path}?v=${v}`;
/** Storefront variant URL, the form the theme actually renders. */
const variant = (path, v, w = 800) => `${STORE_CDN}${stemOf(path)}_${w}x.${extOf(path)}?v=${v}`;

const rows = []; // csv
const urls = new Set(); // urls.txt
const manifest = {
  generated_at: new Date().toISOString(),
  target: site._meta.target,
  platform: site._meta.platform,
  shop: site._meta.shop,
  theme: site._meta.theme,
  counts: {},
  images: { products: [], branding: [], hero_and_banners: [], historical_banners: [], gallery_second_shots: [] },
  scripts: { shopify_platform: site.shopify_platform_cdn, installed_apps: site.installed_app_cdn },
  endpoints: site.commerce_api_endpoints,
  sitemaps: site.sitemaps,
  collections: site.collections,
  pages: site.pages,
  cdn_image_transform_rules: site.cdn_image_transform_rules,
};

const add = (category, id, url, kind, version, source) => {
  urls.add(url);
  rows.push({ category, id, url, kind, version: version ?? "", source });
};

// ---- product primary images (+ any expanded galleries) -------------------
for (const p of products.products) {
  const c = canonical(p.path, p.v);
  add("product-primary", p.handle, c, extOf(p.path), p.v, "sitemap_products_1.xml");
  manifest.images.products.push({
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    product_url: `https://vixenbrand.com/products/${p.handle}`,
    primary: c,
    primary_800x: variant(p.path, p.v, 800),
    gallery: (p.gallery ?? []).map((g, i) => ({ position: i + 1, url: canonical(g.path, g.v), width: g.w, height: g.h })),
  });
  for (const g of p.gallery ?? []) add("product-gallery", p.handle, canonical(g.path, g.v), extOf(g.path), g.v, "products.json");
}

// ---- branding / hero / banners ------------------------------------------
for (const b of site.branding) {
  add("branding", b.id, canonical(b.path, b.v), extOf(b.path), b.v, "homepage HTML");
  manifest.images.branding.push({ id: b.id, canonical: canonical(b.path, b.v), observed: variant(b.path, b.v, parseInt(b.observed_variant, 10)), note: b.note });
}

for (const h of site.hero_and_banners) {
  add("hero-banner", h.id, canonical(h.path, h.v), extOf(h.path), h.v, "homepage HTML");
  manifest.images.hero_and_banners.push({ id: h.id, canonical: canonical(h.path, h.v), observed: variant(h.path, h.v, parseInt(h.observed_variant, 10)), links_to: h.links_to ?? null });
}

for (const h of site.historical_banners_from_wayback_cdx.items) {
  add("historical-banner", h.id, canonical(h.path, h.v), extOf(h.path), h.v, "web.archive.org CDX");
  manifest.images.historical_banners.push({ id: h.id, canonical: canonical(h.path, h.v), observed: h.observed_variant ? variant(h.path, h.v, parseInt(h.observed_variant, 10)) : null });
}

for (const g of site.homepage_product_gallery_second_shots.items) {
  add("product-secondary", g.for_handle, canonical(g.path, g.v), extOf(g.path), g.v, "homepage HTML");
  manifest.images.gallery_second_shots.push({ for_handle: g.for_handle, canonical: canonical(g.path, g.v), observed: variant(g.path, g.v, parseInt(g.observed_variant, 10)) });
}

// ---- non-image CDN resources --------------------------------------------
for (const s of site.shopify_platform_cdn) if (s.url.startsWith("http")) add("shopify-platform", s.kind, s.url, "js", "", "homepage HTML");
for (const a of site.installed_app_cdn) add("installed-app", a.app, a.url, "js", "", "homepage HTML");
for (const e of site.commerce_api_endpoints) add("endpoint", e.kind, e.url, "json/md", "", "discovery");
for (const s of site.sitemaps) add("sitemap", "sitemap", s, "xml", "", "discovery");

// ---- counts --------------------------------------------------------------
manifest.counts = {
  products: products.products.length,
  product_primary_images: products.products.length,
  product_gallery_images: manifest.images.products.reduce((n, p) => n + p.gallery.length, 0),
  product_secondary_images: manifest.images.gallery_second_shots.length,
  branding_images: manifest.images.branding.length,
  hero_and_banner_images: manifest.images.hero_and_banners.length,
  historical_banner_images: manifest.images.historical_banners.length,
  shopify_platform_scripts: site.shopify_platform_cdn.length,
  installed_app_scripts: site.installed_app_cdn.length,
  collections: site.collections.length,
  pages: site.pages.length,
  unique_urls: urls.size,
  csv_rows: rows.length,
};

// ---- write ---------------------------------------------------------------
// urls.txt is meant to be piped straight into `wget -i`, so keep it media-only
// and split the non-downloadable surfaces into their own files.
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|avif|gif|svg|ico)(\?|$)/i;
const CODE_EXT = /\.(js|mjs|css)(\?|$)/i;
const isTemplate = (u) => /[{}<>]/.test(u); // pattern, not a fetchable URL
const all = [...urls].sort();
const concrete = all.filter((u) => !isTemplate(u));
const templates = all.filter(isTemplate);
const media = concrete.filter((u) => IMAGE_EXT.test(u));
const code = concrete.filter((u) => CODE_EXT.test(u));
const apis = concrete.filter((u) => !IMAGE_EXT.test(u) && !CODE_EXT.test(u));
manifest.url_templates = templates;
manifest.counts.url_templates = templates.length;
manifest.counts.media_assets = media.length;
manifest.counts.code_resources = code.length;
manifest.counts.api_endpoints = apis.length;

writeFileSync(join(HERE, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(HERE, "urls.txt"), media.join("\n") + "\n");
writeFileSync(join(HERE, "scripts.txt"), code.join("\n") + "\n");
writeFileSync(join(HERE, "endpoints.txt"), apis.join("\n") + "\n");

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const header = ["category", "id", "url", "kind", "version", "source"];
const csv = [header.join(","), ...rows.map((r) => header.map((h) => esc(r[h])).join(","))].join("\n");
writeFileSync(join(HERE, "assets.csv"), csv + "\n");

// A ready-to-run mirror command for anyone who just wants the bytes.
writeFileSync(
  join(HERE, "download.sh"),
  `#!/usr/bin/env bash
# Mirror every CDN media asset listed in urls.txt into ./mirror, preserving the
# CDN path structure. Run from a machine with normal internet access.
#   bash cdn-audit/download.sh            # full resolution
#   WIDTH=800 bash cdn-audit/download.sh  # resized variants instead
set -euo pipefail
cd "$(dirname "$0")"
WIDTH="\${WIDTH:-}"
mkdir -p mirror
while read -r url; do
  [ -z "$url" ] && continue
  target="$url"
  if [ -n "$WIDTH" ]; then
    # https://cdn.shopify.com/.../foo.jpg?v=1 -> https://vixenbrand.com/cdn/shop/.../foo_800x.jpg?v=1
    target=$(printf '%s' "$url" \\
      | sed -E 's#https://cdn\\.shopify\\.com/s/files/1/0251/8217/5331/#https://vixenbrand.com/cdn/shop/#' \\
      | sed -E "s#(\\.[A-Za-z0-9]+)(\\?|\$)#_\${WIDTH}x\\1\\2#")
  fi
  rel=$(printf '%s' "$target" | sed -E 's#^https?://[^/]+/##; s#\\?.*\$##')
  mkdir -p "mirror/$(dirname "$rel")"
  if [ -f "mirror/$rel" ]; then continue; fi
  curl -fsSL --retry 3 --retry-delay 2 -A 'govaly-cdn-audit/1.0' -o "mirror/$rel" "$target" \\
    && echo "ok   $rel" || echo "FAIL $target"
  sleep 0.2
done < urls.txt
echo "done -> $(pwd)/mirror"
`
);

console.log(`manifest.json   ${all.length} unique URLs total (${concrete.length} fetchable, ${templates.length} templates)`);
console.log(`urls.txt        ${media.length} media assets`);
console.log(`scripts.txt     ${code.length} js/css resources`);
console.log(`endpoints.txt   ${apis.length} api/sitemap endpoints`);
console.log(`assets.csv      ${rows.length} rows`);
console.log(JSON.stringify(manifest.counts, null, 2));

