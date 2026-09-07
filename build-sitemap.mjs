// Generates sitemap.xml from what the page actually references.
//
// Run after ANY edit to index.html:   node build-sitemap.mjs
//
// Two deliberate choices:
//
// 1. Only the two canonical URLs are listed, "/" and "/en". The section routes
//    (/grades, /packing, /quote …) are the same document and canonicalise onto
//    these two, so listing them would only earn "Alternate page with proper
//    canonical tag" rows in Search Console — noise, not coverage.
//
// 2. Image entries carry <image:loc> alone. Google deprecated image:title,
//    image:caption, image:geo_location and image:license in 2022 and ignores them.
//
// lastmod comes from the last commit that touched index.html, not from the clock,
// so re-running the build on unchanged content does not falsely claim freshness.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SITE = "https://www.alsultan-zahdi-dates.com";
const html = readFileSync("index.html", "utf8");

/* ── content date ──────────────────────────────────────────────────────────── */
let lastmod;
try {
  lastmod = execSync("git log -1 --format=%cs -- index.html", { encoding: "utf8" }).trim();
} catch { /* not a git checkout */ }
if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod || "")) lastmod = new Date().toISOString().slice(0, 10);

/* ── the photography the page actually shows ───────────────────────────────── */
// Icons are chrome, not content — they do not belong in an image sitemap.
const SKIP = /(favicon|apple-touch-icon|icon-\d+|logo|emblem-master)/;
const images = [...new Set(
  [...html.matchAll(/(?:src|href)="(assets\/[^"]+\.(?:jpg|jpeg|png|webp))"/g)].map(m => m[1])
)].filter(f => !SKIP.test(f)).sort();

if (!images.length) throw new Error("no content images found in index.html — check the markup");

/* ── build ─────────────────────────────────────────────────────────────────── */
const alternates = [
  ["ar", `${SITE}/`],
  ["en", `${SITE}/en`],
  ["x-default", `${SITE}/`],
];

const url = (loc, priority) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
${alternates.map(([l, h]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${h}" />`).join("\n")}
${images.map(i => `    <image:image><image:loc>${SITE}/${i}</image:loc></image:image>`).join("\n")}
  </url>`;

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${url(`${SITE}/`, "1.0")}
${url(`${SITE}/en`, "0.9")}
</urlset>
`;

writeFileSync("sitemap.xml", xml, "utf8");
console.log(`sitemap.xml written — 2 URLs, ${images.length} images each, lastmod ${lastmod}`);
