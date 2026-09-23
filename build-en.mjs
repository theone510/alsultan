// Pre-renders each English page as a real static document under en/.
//
// Why this exists: /en used to be a Vercel rewrite onto the Arabic index.html, so the
// RAW html served at /en was Arabic — <html lang="ar">, an Arabic <title>, Arabic
// Open Graph tags and a canonical pointing at "/". Only JavaScript fixed it. Anything
// that does not run JS (WhatsApp, LinkedIn and Twitter link previews, several AI
// crawlers, Google's pre-render pass) saw /en declaring itself a duplicate of "/".
//
// The site has two documents now — the catalogue at "/" and the cinematic journey at
// "/experience" — so this builds both. Each carries its own EN dictionary inline.
//
// Run after ANY edit to index.html or experience.html:   node build-en.mjs
//
// No dependencies. Reads the Arabic page, applies the EN dictionary that already lives
// in it, rewrites the head signals, and writes the English twin.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SITE = "https://www.alsultan-zahdi-dates.com";

const PAGES = [
  { src: "index.html",      out: "en/index.html",      ar: "/",           en: "/en" },
  { src: "experience.html", out: "en/experience.html", ar: "/experience", en: "/en/experience" },
];

// section slugs that resolve to a page of their own; their links must gain the /en
// prefix in the raw HTML too, or a crawler following them lands back on Arabic
const CROSS_PAGE = /\shref="\/(experience|why|grades|packing|product|gallery|shipping|faq|quote)"/g;

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

/* ── 4. build one page ─────────────────────────────────────────────────────── */
function build(page) {
  let html = readFileSync(page.src, "utf8");

  // lift the EN dictionary straight out of the page
  const start = html.indexOf("  const EN={");
  if (start < 0) throw new Error("EN dictionary not found in " + page.src);
  const objStart = html.indexOf("{", start);
  const objEnd = html.indexOf("\n  };", objStart);
  if (objEnd < 0) throw new Error("could not find the end of the EN dictionary in " + page.src);
  const EN = JSON.parse(html.slice(objStart, objEnd + 4)); // "\n  };" → keep through "}"

  const before = html;
  html = replaceInner(html, "data-i18n", k => EN[k]);
  html = replaceAttr(html, "data-i18n-alt", "alt", k => EN[k]);
  html = replaceAttr(html, "data-i18n-ph", "placeholder", k => EN[k]);
  if (html === before) throw new Error("nothing was translated in " + page.src + " — check the markup");

  /* head signals, so a non-JS crawler sees an English page ──────────────────── */
  const head = [
    [`<html lang="ar" dir="rtl" data-base-lang="ar">`, `<html lang="en" dir="ltr" data-base-lang="en">`],
    [`<link rel="canonical" href="${SITE}${page.ar}" />`, `<link rel="canonical" href="${SITE}${page.en}" />`],
    [`<meta property="og:url" content="${SITE}${page.ar}" />`, `<meta property="og:url" content="${SITE}${page.en}" />`],
    [`<meta property="og:locale" content="ar_IQ" />`, `<meta property="og:locale" content="en_US" />`],
    [`<meta property="og:locale:alternate" content="en_US" />`, `<meta property="og:locale:alternate" content="ar_IQ" />`],
  ];
  for (const [a, b] of head) {
    if (!html.includes(a)) throw new Error(`head marker not found in ${page.src}: ${a}`);
    html = html.replace(a, b);
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${EN["doc.title"]}</title>`);
  const meta = (sel, val) => {
    const re = new RegExp(`(<meta ${sel} content=")[^"]*(")`);
    if (!re.test(html)) throw new Error(`meta not found in ${page.src}: ${sel}`);
    html = html.replace(re, `$1${val.replace(/\$/g, "$$$$")}$2`);
  };
  meta(`name="description"`, EN["doc.desc"]);
  meta(`property="og:title"`, EN["doc.ogTitle"]);
  meta(`property="og:description"`, EN["doc.ogDesc"]);
  meta(`name="twitter:title"`, EN["doc.ogTitle"]);
  meta(`name="twitter:description"`, EN["doc.ogDesc"]);

  /* relative asset paths would resolve under /en/ — make them root-absolute ─── */
  html = html.replace(/"assets\//g, '"/assets/').replace(/\(assets\//g, "(/assets/");

  /* links between the two documents must stay inside /en ───────────────────── */
  // JS fixes these up at runtime, but a crawler that does not run JS follows the raw
  // href — and an English page linking to the Arabic /grades is a hreflang own goal.
  html = html.replace(CROSS_PAGE, ' href="/en/$1"');
  html = html.replace(/ data-page="" href="\/"/g, ' data-page="" href="/en"');

  /* the graph must describe THIS document, not the Arabic one ───────────────── */
  // The FAQ matters most here: Google requires FAQ markup to match the text actually
  // visible on the page, so leaving the Arabic questions on the English document
  // would be a mismatch, not a translation gap.
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
    const data = JSON.parse(json);
    for (const node of data["@graph"]) {
      if (node["@type"] === "WebPage") {
        node["@id"] = `${SITE}${page.en}#webpage`;
        node.url = `${SITE}${page.en}`;
        node.name = EN["doc.title"];
        node.description = EN["doc.desc"];
        node.inLanguage = "en";
        if (node.breadcrumb) node.breadcrumb = { "@id": `${SITE}${page.en}#breadcrumb` };
      }
      if (node["@type"] === "BreadcrumbList") {
        node["@id"] = `${SITE}${page.en}#breadcrumb`;
        const names = ["Alsultan Dates", "The Journey"];
        const urls = [`${SITE}/en`, `${SITE}${page.en}`];
        node.itemListElement = node.itemListElement.map((it, i) => ({ ...it, name: names[i], item: urls[i] }));
      }
      if (node["@type"] === "FAQPage") {
        node["@id"] = `${SITE}${page.en}#faq`;
        node.isPartOf = { "@id": `${SITE}${page.en}#webpage` };
        node.inLanguage = "en";
        node.mainEntity = node.mainEntity.map((_q, i) => {
          const q = EN[`faq.q${i + 1}`], ans = EN[`faq.a${i + 1}`];
          if (!q || !ans) throw new Error(`missing English text for faq.q${i + 1}/faq.a${i + 1}`);
          return { "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } };
        });
      }
      if (node["@type"] === "ItemList") node.inLanguage = "en";
    }
    return a + "\n" + JSON.stringify(data, null, 1) + "\n" + b;
  });

  mkdirSync(dirname(page.out), { recursive: true });
  writeFileSync(page.out, html, "utf8");
  console.log(`${page.out} written — ${(html.length / 1024).toFixed(1)} KB, ${Object.keys(EN).length} strings applied`);
}

for (const page of PAGES) build(page);
