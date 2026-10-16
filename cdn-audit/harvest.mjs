#!/usr/bin/env node
/**
 * harvest.mjs — exhaustive CDN resource harvester for a Shopify storefront.
 *
 * The Arena sandbox has no outbound network access to arbitrary hosts, so this
 * script is meant to be run on a machine that does:
 *
 *     node cdn-audit/harvest.mjs                     # manifest only
 *     node cdn-audit/harvest.mjs --download          # manifest + mirror every file
 *     node cdn-audit/harvest.mjs --variants 800,1600 # also grab sized variants
 *     node cdn-audit/harvest.mjs --site https://example.com --out ./out
 *
 * What it collects:
 *   1. /sitemap.xml and every child sitemap -> all public URLs + published images
 *   2. /products.json (paginated)          -> EVERY product image, variant, SKU, price
 *   3. /collections.json + per-collection products.json
 *   4. HTML of the homepage, every collection and a sample of product pages
 *      -> <link>/<script>/<img>/srcset/data-bgset/font/theme-asset URLs
 *   5. /agents.md and /.well-known/ucp     -> commerce API surface
 *
 * It normalizes Shopify's on-demand size variants (…_800x.jpg) back to the
 * canonical full-resolution upload (cdn.shopify.com/s/files/…) so you never
 * store the same photo seventeen times.
 *
 * Politeness: identifies itself as a bot (the store's own /agents.md asks for
 * this), serialises requests with a delay, and honours 429 Retry-After.
 *
 * Zero dependencies. Node 18+.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

// --------------------------------------------------------------------------- args
const argv = process.argv.slice(2);
const flag = (name, fallback = true) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback === true ? false : fallback;
  const next = argv[i + 1];
  return next && !next.startsWith("--") ? next : fallback;
};

const SITE = String(flag("site", "https://vixenbrand.com")).replace(/\/$/, "");
const OUT = String(flag("out", join(dirname(new URL(import.meta.url).pathname), "harvested")));
const DELAY = Number(flag("delay", 350));
const CONCURRENCY = Number(flag("concurrency", 4));
const DO_DOWNLOAD = argv.includes("--download");
const VARIANTS = String(flag("variants", ""))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_HTML_PAGES = Number(flag("html-pages", 40));
const UA = "govaly-cdn-audit/1.0 (+research; read-only catalogue harvest)";

// --------------------------------------------------------------------------- http
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { as = "text", tries = 3 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 2 ** attempt;
        console.warn(`  ! ${res.status} ${url} — backing off ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!res.ok) return { ok: false, status: res.status, body: null, headers: res.headers };
      if (as === "buffer") return { ok: true, status: res.status, body: Buffer.from(await res.arrayBuffer()), headers: res.headers };
      return { ok: true, status: res.status, body: await res.text(), headers: res.headers };
    } catch (err) {
      if (attempt === tries) return { ok: false, status: 0, body: null, error: String(err) };
      await sleep(1000 * attempt);
    }
  }
  return { ok: false, status: 0, body: null };
}

// --------------------------------------------------------------------------- url helpers
const MEDIA_RE =
  /https?:\/\/[^\s"'<>()\\]+?\.(?:jpg|jpeg|png|webp|avif|gif|svg|ico|mp4|webm|mov|m3u8|woff2?|ttf|otf|eot|css|js|mjs|json)(?:\?[^\s"'<>()\\]*)?/gi;
const THEME_ASSET_RE = /(?:https?:)?\/\/[^\s"'<>()\\]*\/cdn\/shop\/t\/\d+\/assets\/[^\s"'<>()\\]+/gi;
const ANY_CDN_RE = /(?:https?:)?\/\/[^\s"'<>()\\]*\/cdn\/(?:shop|shopifycloud)\/[^\s"'<>()\\]+/gi;

/** …/foo_800x.jpg or …/foo_800x800_crop_center.webp  ->  …/foo.jpg */
function toCanonical(url) {
  let u = url.replace(/^\/\//, "https://").replace(/\\\//g, "/");
  u = u.replace(/(_\d+x\d*(?:_crop_(?:center|top|bottom|left|right))?)\.(\w+)/, ".$2");
  return u;
}
const pathOf = (url) => {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "") + (u.search || "");
  } catch {
    return url;
  }
};
const extOf = (url) => (url.split("?")[0].match(/\.(\w+)$/)?.[1] ?? "bin").toLowerCase();

const found = new Map(); // canonical url -> { url, sources:Set, kind }
function record(rawUrl, source) {
  if (!rawUrl) return;
  let url = rawUrl.replace(/^\/\//, "https://").replace(/\\\//g, "/");
  if (url.startsWith("/")) url = SITE + url;
  const canonical = toCanonical(url);
  const kind = extOf(canonical);
  if (!["jpg", "jpeg", "png", "webp", "avif", "gif", "svg", "ico", "mp4", "webm", "mov", "woff", "woff2", "ttf", "otf", "eot", "css", "js", "mjs"].includes(kind)) return;
  if (!found.has(canonical)) found.set(canonical, { url: canonical, kind, sources: new Set(), variants: new Set() });
  found.get(canonical).sources.add(source);
  if (canonical !== url) found.get(canonical).variants.add(url);
}
function scan(text, source) {
  if (!text) return;
  const unescaped = text.replace(/\\\//g, "/");
  for (const m of unescaped.match(MEDIA_RE) ?? []) record(m, source);
  for (const m of unescaped.match(THEME_ASSET_RE) ?? []) record(m, source);
  for (const m of unescaped.match(ANY_CDN_RE) ?? []) record(m, source);
}

// --------------------------------------------------------------------------- 1. sitemaps
async function harvestSitemaps() {
  const seen = new Set();
  const pageUrls = [];
  const queue = [`${SITE}/sitemap.xml`];

  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const r = await get(url);
    if (!r.ok) {
      console.warn(`  sitemap miss ${url} (${r.status})`);
      continue;
    }
    scan(r.body, `sitemap:${url.replace(SITE, "")}`);
    const inner = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].trim().replace(/&amp;/g, "&"));
    for (const loc of inner) {
      if (/sitemap[^/]*\.xml/.test(loc)) queue.push(loc);
      else pageUrls.push(loc);
    }
    await sleep(DELAY);
  }
  return { sitemaps: [...seen], pageUrls };
}

// --------------------------------------------------------------------------- 2. products.json
async function harvestProducts() {
  const all = [];
  for (let page = 1; page <= 40; page++) {
    const url = `${SITE}/products.json?limit=250&page=${page}`;
    const r = await get(url);
    if (!r.ok) break;
    let json;
    try {
      json = JSON.parse(r.body);
    } catch {
      break;
    }
    const batch = json.products ?? [];
    if (!batch.length) break;
    for (const p of batch) {
      const images = (p.images ?? []).map((img, i) => {
        record(img.src, `products.json:${p.handle}`);
        return { position: i + 1, url: img.src, width: img.width, height: img.height };
      });
      if (p.image) record(p.image, `products.json:${p.handle}`);
      all.push({
        id: p.id,
        handle: p.handle,
        title: p.title,
        vendor: p.vendor,
        product_type: p.product_type,
        tags: p.tags,
        published_at: p.published_at,
        url: `${SITE}/products/${p.handle}`,
        image_count: images.length,
        images,
        variants: (p.variants ?? []).map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          compare_at_price: v.compare_at_price,
          available: v.available,
          ...(v.featured_image ? { featured_image: v.featured_image } : {}),
        })),
        options: (p.options ?? []).map((o) => ({ name: o.name, values: o.values })),
      });
    }
    console.log(`  products.json page ${page}: ${batch.length} products (${all.length} total)`);
    if (batch.length < 250) break;
    await sleep(DELAY);
  }
  return all;
}

// --------------------------------------------------------------------------- 3. collections
async function harvestCollections() {
  const r = await get(`${SITE}/collections.json?limit=250`);
  if (!r.ok) return [];
  const collections = JSON.parse(r.body).collections ?? [];
  for (const c of collections) {
    if (c.image) record(c.image.src ?? c.image, `collections.json:${c.handle}`);
    const pr = await get(`${SITE}/collections/${c.handle}/products.json?limit=250`);
    if (pr.ok) {
      for (const p of JSON.parse(pr.body).products ?? []) {
        for (const img of p.images ?? []) record(img.src, `collection:${c.handle}`);
      }
    }
    await sleep(DELAY);
  }
  return collections;
}

// --------------------------------------------------------------------------- 4. HTML pages
async function harvestHtml(pageUrls) {
  // Homepage first (carries the theme's CSS/JS/font tags), then collections and pages.
  const priority = [`${SITE}/`, `${SITE}/collections/all`, `${SITE}/cart`, `${SITE}/search`];
  const rest = pageUrls.filter((u) => !priority.includes(u));
  const targets = [...priority, ...rest].slice(0, MAX_HTML_PAGES);
  const scraped = [];
  for (const url of targets) {
    const r = await get(url);
    if (!r.ok) continue;
    scan(r.body, `html:${url.replace(SITE, "") || "/"}`);
    scraped.push({ url, bytes: r.body.length });
    console.log(`  html ${url.replace(SITE, "") || "/"} (${(r.body.length / 1024).toFixed(0)} KB)`);
    await sleep(DELAY);
  }
  return scraped;
}

// --------------------------------------------------------------------------- 5. agent/commerce surface
async function harvestEndpoints() {
  const endpoints = ["/agents.md", "/.well-known/ucp", "/robots.txt"];
  const out = {};
  for (const path of endpoints) {
    const r = await get(SITE + path);
    out[path] = r.ok ? { status: r.status, body: r.body.slice(0, 20000) } : { status: r.status ?? 0 };
    if (r.ok) scan(r.body, `endpoint:${path}`);
    await sleep(DELAY);
  }
  return out;
}

// --------------------------------------------------------------------------- download
async function downloadAll(entries) {
  const queue = [...entries];
  let done = 0;
  let bytes = 0;
  let failed = 0;

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      const rel = pathOf(item.url).replace(/^cdn\/shop\//, "");
      const dest = join(OUT, "mirror", rel);
      try {
        await readFile(dest); // skip if already mirrored
        done++;
        continue;
      } catch {}
      const r = await get(item.url, { as: "buffer" });
      if (!r.ok) {
        failed++;
        console.warn(`  x ${r.status} ${item.url}`);
        continue;
      }
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, r.body);
      bytes += r.body.length;
      done++;
      if (done % 25 === 0) console.log(`  … ${done}/${entries.length} files, ${(bytes / 1048576).toFixed(1)} MB`);
      await sleep(DELAY / CONCURRENCY);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { downloaded: done, failed, bytes };
}

// --------------------------------------------------------------------------- main
console.log(`\nCDN harvest → ${SITE}`);
console.log(`output     → ${OUT}\n`);
await mkdir(OUT, { recursive: true });

const t0 = Date.now();
console.log("[1/5] sitemaps");
const { sitemaps, pageUrls } = await harvestSitemaps();
console.log(`      ${sitemaps.length} sitemaps, ${pageUrls.length} public URLs`);

console.log("[2/5] products.json");
const products = await harvestProducts();
console.log(`      ${products.length} products, ${products.reduce((n, p) => n + p.image_count, 0)} images`);

console.log("[3/5] collections");
const collections = await harvestCollections();

console.log("[4/5] html pages");
const scrapedHtml = await harvestHtml(pageUrls);

console.log("[5/5] agent + commerce endpoints");
const endpoints = await harvestEndpoints();

// ---- assemble ------------------------------------------------------------
const assets = [...found.values()]
  .map((a) => ({
    url: a.url,
    kind: a.kind,
    host: new URL(a.url).host,
    cdn_path: pathOf(a.url),
    variant_count: a.variants.size,
    observed_variants: [...a.variants].slice(0, 20),
    sources: [...a.sources],
  }))
  .sort((a, b) => a.cdn_path.localeCompare(b.cdn_path));

const byKind = assets.reduce((acc, a) => ((acc[a.kind] = (acc[a.kind] ?? 0) + 1), acc), {});
const byHost = assets.reduce((acc, a) => ((acc[a.host] = (acc[a.host] ?? 0) + 1), acc), {});

const manifest = {
  site: SITE,
  harvested_at: new Date().toISOString(),
  duration_ms: Date.now() - t0,
  user_agent: UA,
  summary: {
    total_assets: assets.length,
    by_kind: byKind,
    by_host: byHost,
    products: products.length,
    product_images: products.reduce((n, p) => n + p.image_count, 0),
    collections: collections.length,
    sitemaps: sitemaps.length,
    public_urls: pageUrls.length,
    html_pages_scraped: scrapedHtml.length,
  },
  assets,
  products,
  collections,
  sitemaps,
  public_urls: pageUrls,
  html_pages: scrapedHtml,
  endpoints,
};

await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(OUT, "urls.txt"), assets.map((a) => a.url).join("\n") + "\n");
await writeFile(
  join(OUT, "assets.csv"),
  [
    "kind,host,cdn_path,url,variant_count,sources",
    ...assets.map((a) => [a.kind, a.host, a.cdn_path, a.url, a.variant_count, `"${a.sources.join(" | ")}"`].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n") + "\n"
);

console.log(`\n=== ${assets.length} unique CDN assets ===`);
console.table(byKind);
console.table(byHost);

if (DO_DOWNLOAD) {
  console.log(`\nMirroring ${assets.length} files → ${join(OUT, "mirror")}`);
  const targets = [...assets];
  if (VARIANTS.length) {
    for (const a of assets) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(a.url)) continue;
      for (const w of VARIANTS) {
        const v = a.url.replace(/(\.\w+)(\?|$)/, `_${w}x$1$2`);
        targets.push({ url: v, kind: a.kind });
      }
    }
    console.log(`  (+ sized variants ${VARIANTS.join(", ")} → ${targets.length} total)`);
  }
  const stats = await downloadAll(targets);
  console.log(`\nDone: ${stats.downloaded} files, ${(stats.bytes / 1048576).toFixed(1)} MB, ${stats.failed} failed.`);
} else {
  console.log(`\nManifest written. Re-run with --download to mirror the files.`);
}
