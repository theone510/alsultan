// Alsultan Dates — RFQ intake + admin dashboard + quotations
// Cloudflare Worker + D1

import {
  json, html, redirect, nowISO, makeRef, splitContact, rateLimit,
  allowedOrigin, corsHeaders, esc
} from "./util.js";
import { isAuthed, checkPassword, makeSession, sessionCookie } from "./auth.js";
import { sendTelegram, sendEmail, managerEmailHTML, ackEmailHTML, telegramText } from "./notify.js";
import * as admin from "./admin.js";
import { publicQuote, respondQuote } from "./quote.js";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = req.method.toUpperCase();
    const db = env.DB;

    /* ---------- CORS preflight ---------- */
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin(env, req)) });
    }

    /* ---------- صحة الخدمة ---------- */
    if (path === "/health") return json({ ok: true, time: nowISO() });

    /* ---------- استقبال طلب عرض السعر ---------- */
    if (path === "/api/rfq" && method === "POST") return intake(req, env, ctx, db);

    /* ---------- صفحة العرض العلنية ---------- */
    if (path.startsWith("/q/")) {
      const rest = path.slice(3);
      if (rest.endsWith("/respond") && method === "POST") {
        return respondQuote(env, db, rest.slice(0, -"/respond".length), await req.formData(), ctx);
      }
      if (method === "GET") {
        return publicQuote(env, db, rest, {
          lang: url.searchParams.get("lang"),
          done: url.searchParams.get("done"),
          preview: url.searchParams.get("preview") === "1"
        });
      }
    }

    /* ---------- لوحة التحكم ---------- */
    if (path === "/admin/login") {
      if (method === "GET") return admin.loginPage(env);
      if (method === "POST") {
        const form = await req.formData();
        const ip = req.headers.get("cf-connecting-ip") || "0.0.0.0";
        const rl = await rateLimit(db, `login:${ip}`, { limit: 8, windowSec: 900 });
        if (!rl.ok) return admin.loginPage(env, { error: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." });
        if (!checkPassword(env, form.get("password"))) {
          return admin.loginPage(env, { error: "كلمة المرور غير صحيحة." });
        }
        const token = await makeSession(env);
        return redirect("/admin", {
          headers: { "set-cookie": sessionCookie(token, { secure: url.protocol === "https:" }) }
        });
      }
    }

    if (path === "/admin/logout" && method === "POST") {
      return redirect("/admin/login", { headers: { "set-cookie": sessionCookie("", { clear: true, secure: url.protocol === "https:" }) } });
    }

    if (path === "/admin" || path.startsWith("/admin/")) {
      if (!(await isAuthed(env, req))) return admin.loginPage(env);
      return adminRoutes(req, env, db, url, path, method);
    }

    /* ---------- الجذر ---------- */
    if (path === "/") return redirect("/admin");

    return new Response("Not found", { status: 404 });
  }
};

/* ============================ استقبال الطلب ============================ */

async function intake(req, env, ctx, db) {
  const origin = allowedOrigin(env, req);
  const cors = corsHeaders(origin);
  const fail = (status, error) => json({ ok: false, error }, { status, headers: cors });

  let data;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) data = await req.json();
    else data = Object.fromEntries((await req.formData()).entries());
  } catch {
    return fail(400, "bad_payload");
  }

  // مصيدة السبام: حقل مخفي يجب أن يبقى فارغاً
  if (String(data.website || "").trim()) return json({ ok: true, ref: "—" }, { headers: cors });

  const clean = (v, max = 400) => String(v == null ? "" : v).trim().slice(0, max);
  const r = {
    company: clean(data.company, 160),
    country: clean(data.country, 100),
    qty: clean(data.qty, 120),
    grade: clean(data.grade, 120),
    pack: clean(data.pack, 120),
    contact: clean(data.contact, 200),
    notes: clean(data.notes, 2000),
    lang: data.lang === "en" ? "en" : "ar"
  };
  for (const k of ["company", "country", "qty", "grade", "pack", "contact"]) {
    if (!r[k]) return fail(422, `missing_${k}`);
  }

  const ip = req.headers.get("cf-connecting-ip") || "0.0.0.0";
  const rl = await rateLimit(db, `rfq:${ip}`, { limit: 5, windowSec: 900 });
  if (!rl.ok) return fail(429, "rate_limited");

  const { email, phone } = splitContact(r.contact);
  const now = nowISO();
  const ref = await makeRef(db, "RFQ", "rfq");

  const ins = await db.prepare(`INSERT INTO requests
    (ref, company, country, qty, grade, pack, contact, contact_email, contact_phone, notes, lang,
     status, ip, country_code, ua, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'new',?,?,?,?,?)`)
    .bind(ref, r.company, r.country, r.qty, r.grade, r.pack, r.contact, email, phone, r.notes, r.lang,
      ip, req.headers.get("cf-ipcountry") || null, (req.headers.get("user-agent") || "").slice(0, 300), now, now)
    .run();

  const row = { ...r, ref, id: ins.meta && ins.meta.last_row_id };

  const work = Promise.all([
    sendTelegram(env, telegramText(env, row)),
    sendEmail(env, {
      to: env.MAIL_TO || env.SALES_EMAIL,
      subject: `طلب عرض سعر — ${row.company} (${row.country}) — ${ref}`,
      html: managerEmailHTML(env, row),
      replyTo: email || undefined
    }),
    email ? sendEmail(env, {
      to: email,
      subject: r.lang === "en" ? `We received your request — ${ref}` : `استلمنا طلبك — ${ref}`,
      html: ackEmailHTML(env, row, r.lang),
      replyTo: env.SALES_EMAIL
    }) : Promise.resolve({ skipped: true })
  ]);
  if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work;

  return json({ ok: true, ref }, { headers: cors });
}

/* ============================ مسارات اللوحة ============================ */

async function adminRoutes(req, env, db, url, path, method) {
  if (path === "/admin") return admin.dashboard(env, db, url);
  if (path === "/admin/quotes") return admin.quotesList(env, db);
  if (path === "/admin/export.csv") return admin.exportCSV(env, db);

  let m;
  if ((m = path.match(/^\/admin\/r\/(\d+)$/))) {
    if (method === "POST") return admin.updateRequest(env, db, m[1], await req.formData());
    return admin.requestDetail(env, db, m[1], { saved: url.searchParams.get("saved") });
  }

  if (path === "/admin/quote/new") {
    if (method === "POST") return admin.createQuote(env, db, await req.formData());
    return admin.quoteForm(env, db, url);
  }

  if ((m = path.match(/^\/admin\/q\/(\d+)$/))) {
    return admin.quoteAdminView(env, db, m[1], {
      created: url.searchParams.get("created"),
      saved: url.searchParams.get("saved"),
      sent: url.searchParams.get("sent"),
      mail: url.searchParams.get("mail")
    });
  }

  if ((m = path.match(/^\/admin\/q\/(\d+)\/edit$/))) {
    const q = await db.prepare("SELECT * FROM quotes WHERE id = ?").bind(m[1]).first();
    if (!q) return new Response("Not found", { status: 404 });
    return admin.quoteForm(env, db, url, { quote: q });
  }

  if ((m = path.match(/^\/admin\/q\/(\d+)\/update$/)) && method === "POST") {
    return admin.updateQuote(env, db, m[1], await req.formData());
  }

  if ((m = path.match(/^\/admin\/q\/(\d+)\/send$/)) && method === "POST") {
    return admin.sendQuote(env, db, m[1], await req.formData());
  }

  return new Response("Not found", { status: 404 });
}
