// Pre-renders the English page as a real static document at en/index.html.
//
// Why this exists: /en used to be a Vercel rewrite onto the Arabic index.html, so the
// RAW html served at /en was Arabic — <html lang="ar">, an Arabic <title>, Arabic
// Open Graph tags and a canonical pointing at "/". Only JavaScript fixed it. Anything
// that does not run JS (WhatsApp, LinkedIn and Twitter link previews, several AI
// crawlers, Google's pre-render pass) saw /en declaring itself a duplicate of "/".
//
// Run after ANY edit to index.html:   node build-en.mjs
//
// No dependencies. Reads index.html, applies the EN dictionary that already lives in
// the page, rewrites the head signals, and writes en/index.html.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://www.alsultan-zahdi-dates.com";
const SRC = "index.html";
const OUT_DIR = "en";
const OUT = `${OUT_DIR}/index.html`;

let html = readFileSync(SRC, "utf8");

/* ── 1. lift the EN dictionary straight out of the page ─────────────────────── */
const start = html.indexOf("  const EN={");
if (start < 0) throw new Error("EN dictionary not found in " + SRC);
const objStart = html.indexOf("{", start);
const objEnd = html.indexOf("\n  };", objStart);
if (objEnd < 0) throw new Error("could not find the end of the EN dictionary");
const EN = JSON.parse(html.slice(objStart, objEnd + 4)); // "\n  };" → keep through "}"

/* ── 2. replace the inner HTML of every [data-i18n] element ─────────────────── */
// Walks the opening tag, then tracks depth so nested same-name tags cannot fool it.
function replaceInner(src, attr, pick) {
  const hits = [];
  const re = new RegExp(`\\s${attr}="([^"]+)"`, "g");
  let m;
  while ((m = re.exec(src))) hits.push({ at: m.index, key: m[1] });

  // back to front, so earlier offsets stay valid
  for (let i = hits.length - 1; i >= 0; i--) {
    const { at, key } = hits[i];
    const value = pick(key);
    if (value === undefined) continue;

    const lt = src.lastIndexOf("<", at);
    const tag = /^<([a-zA-Z0-9-]+)/.exec(src.slice(lt))[1];

    // end of the opening tag, ignoring ">" inside quoted attribute values
    let j = lt, quote = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) { if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (src[j - 1] === "/") continue; // self-closing, nothing to fill
    const openEnd = j + 1;

    // matching close tag
    let depth = 1, k = openEnd, closeStart = -1;
    const open = new RegExp(`<${tag}[\\s/>]`, "i");
    const close = new RegExp(`</${tag}\\s*>`, "i");
    while (k < src.length) {
      const nextOpen = src.slice(k).search(open);
      const nextClose = src.slice(k).search(close);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) { depth++; k += nextOpen + 1; continue; }
      depth--;
      if (depth === 0) { closeStart = k + nextClose; break; }
      k += nextClose + 1;
    }
    if (closeStart < 0) throw new Error(`unbalanced <${tag}> for ${attr}="${key}"`);
    src = src.slice(0, openEnd) + value + src.slice(closeStart);
  }
  return src;
}

/* ── 3. replace a quoted attribute on an element flagged by another attribute ─ */
function replaceAttr(src, flagAttr, targetAttr, pick) {
  const hits = [];
  const re = new RegExp(`\\s${flagAttr}="([^"]+)"`, "g");
  let m;
  while ((m = re.exec(src))) hits.push({ at: m.index, key: m[1] });

  for (let i = hits.length - 1; i >= 0; i--) {
    const { at, key } = hits[i];
    const value = pick(key);
    if (value === undefined) continue;
    const lt = src.lastIndexOf("<", at);
    let j = lt, quote = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) { if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    const openTag = src.slice(lt, j + 1);
    const tre = new RegExp(`(\\s${targetAttr}=")[^"]*(")`);
    if (!tre.test(openTag)) continue;
    src = src.slice(0, lt) + openTag.replace(tre, `$1${value.replace(/\$/g, "$$$$")}$2`) + src.slice(j + 1);
  }
  return src;
}

const before = html;
html = replaceInner(html, "data-i18n", k => EN[k]);
html = replaceAttr(html, "data-i18n-alt", "alt", k => EN[k]);
html = replaceAttr(html, "data-i18n-ph", "placeholder", k => EN[k]);
if (html === before) throw new Error("nothing was translated — check the markup");

/* ── 4. head signals, so a non-JS crawler sees an English page at /en ───────── */
const head = [
  [`<html lang="ar" dir="rtl" data-base-lang="ar">`, `<html lang="en" dir="ltr" data-base-lang="en">`],
  [`<link rel="canonical" href="${SITE}/" />`, `<link rel="canonical" href="${SITE}/en" />`],
  [`<meta property="og:url" content="${SITE}/" />`, `<meta property="og:url" content="${SITE}/en" />`],
  [`<meta property="og:locale" content="ar_IQ" />`, `<meta property="og:locale" content="en_US" />`],
  [`<meta property="og:locale:alternate" content="en_US" />`, `<meta property="og:locale:alternate" content="ar_IQ" />`],
];
for (const [a, b] of head) {
  if (!html.includes(a)) throw new Error("head marker not found: " + a);
  html = html.replace(a, b);
}
html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${EN["doc.title"]}</title>`);
const meta = (sel, val) => {
  const re = new RegExp(`(<meta ${sel} content=")[^"]*(")`);
  if (!re.test(html)) throw new Error("meta not found: " + sel);
  html = html.replace(re, `$1${val.replace(/\$/g, "$$$$")}$2`);
};
meta(`name="description"`, EN["doc.desc"]);
meta(`property="og:title"`, EN["doc.ogTitle"]);
meta(`property="og:description"`, EN["doc.ogDesc"]);
meta(`name="twitter:title"`, EN["doc.ogTitle"]);
meta(`name="twitter:description"`, EN["doc.ogDesc"]);

/* ── 5. relative asset paths would resolve under /en/ — make them root-absolute */
html = html.replace(/"assets\//g, '"/assets/').replace(/\(assets\//g, "(/assets/");

/* ── 6. the WebPage node must describe THIS url, not the Arabic one ─────────── */
html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
  const data = JSON.parse(json);
  for (const node of data["@graph"]) {
    if (node["@type"] !== "WebPage") continue;
    node["@id"] = `${SITE}/en#webpage`;
    node.url = `${SITE}/en`;
    node.name = EN["doc.title"];
    node.inLanguage = "en";
  }
  return a + "\n" + JSON.stringify(data, null, 1) + "\n" + b;
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`${OUT} written — ${(html.length / 1024).toFixed(1)} KB, ${Object.keys(EN).length} strings applied`);
