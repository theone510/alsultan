// Generates sitemap.xml from what the pages actually reference.
//
// Run after ANY edit to index.html, experience.html or guide.html:   node build-sitemap.mjs
//
// Three deliberate choices:
//
// 1. Only the canonical URLs are listed — "/" and "/en" for the catalogue, and
//    "/experience" and "/en/experience" for the cinematic journey. The section
//    routes (/grades, /packing, /quote …) are the same document and canonicalise
//    onto these, so listing them would only earn "Alternate page with proper
//    canonical tag" rows in Search Console — noise, not coverage.
//
// 2. Image entries carry <image:loc> alone. Google deprecated image:title,
//    image:caption, image:geo_location and image:license in 2022 and ignores them.
//
// 3. Each page contributes its OWN photography, and lastmod comes from the last
//    commit that touched that page's source, not from the clock — so re-running the
//    build on unchanged content does not falsely claim freshness.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SITE = "https://www.alsultan-zahdi-dates.com";

const PAGES = [
  { src: "index.html",      ar: "/",           en: "/en",            priority: ["1.0", "0.9"] },
  { src: "experience.html", ar: "/experience", en: "/en/experience", priority: ["0.7", "0.6"] },
  { src: "guide.html",      ar: "/guide",      en: "/en/guide",      priority: ["0.8", "0.7"] },
];

/* ── content date ──────────────────────────────────────────────────────────── */
function lastmodOf(file) {
  let d;
  try {
    d = execSync(`git log -1 --format=%cs -- ${file}`, { encoding: "utf8" }).trim();
  } catch { /* not a git checkout */ }
  return /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : new Date().toISOString().slice(0, 10);
}

/* ── the photography each page actually shows ──────────────────────────────── */
// Icons are chrome, not content — they do not belong in an image sitemap.
const SKIP = /(favicon|apple-touch-icon|icon-\d+|logo|emblem-master)/;
function imagesOf(file) {
  const html = readFileSync(file, "utf8");
  // pages served at a nested path (/experience/film) carry root-absolute asset
  // paths, so accept both spellings and normalise to the repo-relative one
  const found = [...new Set(
    [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.(?:jpg|jpeg|png|webp))"/g)].map(m => m[1])
  )].filter(f => !SKIP.test(f)).sort();
  if (!found.length) throw new Error(`no content images found in ${file} — check the markup`);
  return found;
}

/* ── build ─────────────────────────────────────────────────────────────────── */
const url = (loc, priority, lastmod, alternates, images) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
${alternates.map(([l, h]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${h}" />`).join("\n")}
${images.map(i => `    <image:image><image:loc>${SITE}/${i}</image:loc></image:image>`).join("\n")}
  </url>`;

const entries = [];
for (const page of PAGES) {
  const lastmod = lastmodOf(page.src);
  const images = imagesOf(page.src);
  const alternates = [
    ["ar", SITE + page.ar],
    ["en", SITE + page.en],
    ["x-default", SITE + page.ar],
  ];
  entries.push(url(SITE + page.ar, page.priority[0], lastmod, alternates, images));
  entries.push(url(SITE + page.en, page.priority[1], lastmod, alternates, images));
  console.log(`${page.ar} + ${page.en} — ${images.length} images, lastmod ${lastmod}`);
}

writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>
`, "utf8");
console.log(`sitemap.xml written — ${entries.length} URLs`);
