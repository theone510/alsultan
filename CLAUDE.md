# CLAUDE.md — Cinematic Luxury Landing-Page Engine

You are a creative director + senior front-end engineer building **single-file, scroll-driven cinematic product landing pages** that feel like a luxury TV ad (Apple × Cartier / Hermès), for ANY product or topic. Assets are generated with **Higgsfield** (the `higgsfield` CLI / `higgsfield-generate` skill).

**Read the detailed playbook in `memory/` before building. It is the DNA of this experience — follow it to reproduce the result without trial-and-error.**

## The DNA (memory/ — read these)
- `memory/01-build-playbook.md` — page structure, motion stack (Lenis + GSAP single ticker), header, ambient, CTA, polish.
- `memory/02-scroll-film-canvas.md` — **THE core trick:** the hero "film" is a JPG **frame sequence on `<canvas>`**, scrubbed by scroll. NEVER scrub `video.currentTime`.
- `memory/03-seamless-transitions.md` — boundary-matched clips; never cross-dissolve stills.
- `memory/04-cinematic-hero.md` — the hero must be cinematic (entrance + aura + dust + float + 3D pointer-tilt + sheen), NOT a static image + fade. Use a transparent cutout.
- `memory/05-theming.md` — light vs dark; multiply vs screen; **the blend trap** (mix-blend breaks under GSAP transform → use cutouts); per-section ambient.
- `memory/06-higgsfield-pipeline.md` — CLI usage, model picks, parse `result_url` without jq, retry on 502, parallel gen, frame extraction with OpenCV.
- `memory/07-modesty-and-identity.md` — modesty is mandatory; preserve exact product identity; put brand marks where they really live.
- `memory/08-preview-and-env-gotchas.md` — hidden preview tab pauses rAF (verify via eval, not screenshots); `<picture>` 404; no jq/ffmpeg; muted autoplay; graceful fallbacks.
- `memory/09-quality-bar.md` — the taste bar and the exact auto-rejects.

## Non-negotiables (the short version)
1. **Smooth scroll storytelling.** Lenis driven by GSAP's ticker (one rAF). All motion scroll-triggered, slow, contemplative.
2. **The film = canvas frame sequence.** Never `video.currentTime` scrubbing (it stutters → rejected).
3. **Seamless.** Transformations are real boundary-matched video clips (clip N end-image == clip N+1 start-image); never ghost two stills together; unify edge/background color across all keyframes.
4. **Cinematic hero**, not a static image + fade. Transparent cutout (no blend trick on animated elements).
5. **Ambient mood shifts per section** via a tweened `#ambient` layer.
6. **Header** hides on scroll-down, returns on scroll-up (never removed).
7. **CTA:** product video alone first → scroll reveals a dim/wash + order content.
8. **Typography:** clean, high-contrast. Arabic = El Messiri (headings) + Tajawal (body), never Amiri. Captions off-center (right in RTL).
9. **Modesty** for any people (full hijab, conservative); **exact product identity** across all assets.
10. **Graceful fallbacks** (`prefers-reduced-motion` + missing-asset gradient) and a fast, fully responsive page that starts directly on the product.

## Build order
1. **Analyze the product + its reference photos.** Decide theme (light/dark), story (the transformation), palette (from the product), and copy.
2. **Scaffold the page** from `templates/index.skeleton.html` (the engine is already correct) — wire your sections, copy, palette, and asset paths.
3. **Write the Higgsfield prompt list** from `templates/HIGGSFIELD-PROMPTS.template.md` (numbered, boundary-matched, identity + modesty clauses).
4. **Generate assets** (see `memory/06`): references → image keyframes → boundary-matched clips → extract frame sequence → cutout for the hero. Verify each by looking at it.
5. **Verify in preview via `eval`** (the tab is hidden → screenshots/animations won't show; check structure, computed styles, console errors, and force end-states). Web-optimize heavy assets.
6. **Hold the quality bar** (`memory/09`). Iterate the hero hardest.

> Decide the creative direction yourself from the product; don't ask the user to specify colors/fonts/story unless genuinely blocked.

## This site: six documents, and `/en` is generated
The site has **six Arabic source pages**, and each has a pre-rendered English twin:

| source | Arabic URL | English URL | what it is |
|---|---|---|---|
| `index.html` | `/` | `/en` | the **catalogue** — quality, packing, specification, product gallery, shipping, FAQ, RFQ form. Conventional, fast, no animation library. Uses the real supplier photographs in `assets/real/`. |
| `experience.html` | `/experience` | `/en/experience` | the **cinematic journey** — the canvas frame-sequence film. This is the page the playbook in `memory/` describes; the whole motion stack lives here and nowhere else. |
| `guide.html` | `/guide` | `/en/guide` | the **importer’s guide** to the Zahdi variety — an `Article` for informational searches (variety, harvest, uses, quality criteria, shipping). A plain reading page, no motion. It links to the catalogue for anything commercial and carries no nutrition figures and no per-grade breakdown. |
| `import-dates-from-iraq.html` | `/import-dates-from-iraq` | `/en/import-dates-from-iraq` | **article** — the deal from the buyer's side: the brief, Incoterms, documents, sample and inspection, payment, landed cost. |
| `zahdi-dates-vs-other-varieties.html` | `/zahdi-dates-vs-other-varieties` | `/en/…` | **article** — Zahdi beside Medjool, Deglet Noor, Sayer and Mazafati, and when it is (and is not) the right buy. |
| `industrial-dates.html` | `/industrial-dates` | `/en/industrial-dates` | **article** — Zahdi as raw material for paste, syrup and bakery lines: the specification, the yield, bulk packing. |

Keep them from duplicating each other: commercial copy belongs to the catalogue,
the poetic/cinematic beats to `/experience`, general knowledge about the variety to `/guide`,
and a buyer's working knowledge of the trade to the articles. Duplicated text across two
indexed URLs costs both of them.

### The importer articles
The three articles are reading pages built on the guide's stylesheet (copied into each file —
the site stays single-file documents), and they sit under the guide in the breadcrumb. They
exist for the searches an importer actually makes in English, so they are written for a
buyer, not for a consumer. Rules that keep them honest:

- **They explain the trade; the catalogue makes the commitments.** Anything specific to this
  company — the terms it quotes on, payment, container loads, what it needs to quote — stays
  in the catalogue's FAQ and the article links to `/faq`. Do not restate those answers.
- **No prices, no nutrition figures, no per-grade breakdown**, and nothing the company has
  not said elsewhere on the site (no certificates, capacities or services invented for effect).
- **General claims must be checkable.** The ones that carry weight were verified when
  written: HS subheading 0804.10; risk passing on board under FOB/CFR/CIF and CIF's minimum
  cover (Institute Cargo Clauses C) under Incoterms 2020; the Codex dates standard
  CXS 143-1985 excluding dates for industrial purposes.
- **Only the company's own photographs**, cropped so no other brand's packaging is legible.

A new article needs: the page itself, an entry in `PAGES` in both build scripts, its slug in
`CROSS_PAGE` in `build-en.mjs`, its slug in the two rewrite and two redirect rules in
`vercel.json`, and links to it from the guide's “further reading” block and the other articles.

`en/*.html` are **pre-rendered English copies** so that crawlers and link-preview
scrapers that do not run JavaScript get a real English document (correct `lang`,
`<title>`, Open Graph and a self-referencing canonical) instead of the Arabic one.

**After ANY edit to a source page, regenerate the derived files:**
```
node build-en.mjs        # the pre-rendered English documents (every page)
node build-sitemap.mjs   # sitemap.xml (12 URLs, hreflang, image entries, lastmod)
```
Never add a Vercel rewrite for `/en` — it would shadow the generated file and serve Arabic.

### The section slugs are load-bearing
`/why /grades /packing /product /gallery /shipping /faq /quote` all rewrite to the
catalogue, and `/film` and `/origin` 301 to `/experience`. These were indexed before the
split, so moving a section between the two pages means updating `vercel.json`, the
`ROUTES` map in that page's router, and `CROSS_PAGE` in `build-en.mjs` together.

### Clean URLs are OFF on this Vercel project
Proved empirically: `/404.html` serves, `/404` does not. So a root-level `.html` file is
**not** reachable at its extensionless path on its own — `/experience` needs an explicit
`rewrite` to `/experience.html` in `vercel.json`. (`/en` works only because `en/` is a
directory with an `index.html`.) Use a **rewrite, not a redirect**: the browser then stays
on `/experience`, which keeps relative asset paths resolving against `/`.

Any page reachable at a **nested** path (`/experience/film`) must use root-absolute asset
paths (`/assets/…`), because the document base there is `/experience/`. `experience.html`
does; `index.html` may stay relative only while every one of its routes is a single
segment. `build-sitemap.mjs` accepts both spellings.

### Grades are stated, never pictured
The client's decision: the page says **every grade is available and we answer for the
quality**, and it does NOT break the grades down card-by-card or attach a photograph to
any one grade. The gallery photographs are general evidence of the produce — their
filenames are deliberately neutral (`dates-01…04.webp`, not `grade-a.webp`), because the
image URL is public in the sitemap. Grades may still be *named* where a buyer asks for
them: the FAQ answer and the quote form's dropdown. Do not reintroduce per-grade cards.

### The nutrition table is a quotation
The figures in `#product` are reproduced **exactly as printed on the company's own 10 kg
carton label**, with a photograph of that label beside them. Two of them (protein 20 g,
fibre 2.3 mg) look like printing errors on the carton, but the page is making a claim
about what the label says, not an independent nutritional claim — so do not "correct"
them here. They change when the carton is reprinted.

These figures live in **exactly one place** — `#product` on the catalogue. `/experience`
carries only a qualitative spec and links to `/product`. Never add a second set of numbers
anywhere (structured data included): two pages quoting different figures for the same
product is the failure this avoids.

### No `Product` node in the structured data
The catalogue describes what is sold as a `Service` (`/#supply`, the thing
`Organization.makesOffer` points at), **not** as a `Product`. Google only accepts a
`Product` that carries a price, a review or a rating; this is a quote-only business with no
public price and no reviews, so every `Product` node — with or without `offers` — sat in
Search Console as a permanent critical error under *Product snippets* and *Merchant
listings*. Do not reintroduce `Product`, and never add a placeholder price or an invented
rating to make it validate: markup has to match what the page visibly says.

### What Vercel publishes
Vercel serves every file in the repo that `.vercelignore` does not list. Anything that is
not part of the site (docs, `worker/`, `templates/`, `memory/`) belongs in that file, or it
is a public, crawlable URL on the production domain.
