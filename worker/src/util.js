// أدوات مشتركة

export const nowISO = () => new Date().toISOString();

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) }
  });
}

export function html(body, init = {}) {
  return new Response(body, {
    status: init.status || 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
      ...(init.headers || {})
    }
  });
}

export function redirect(location, init = {}) {
  return new Response(null, { status: init.status || 302, headers: { location, ...(init.headers || {}) } });
}

/* ---------- CORS ---------- */
// يقبل المطابقة الحرفية، ويقبل بادئة نجمة للنطاقات الفرعية مثل: https://*.vercel.app
export function allowedOrigin(env, req) {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  for (const entry of list) {
    if (entry === origin) return origin;
    const star = entry.indexOf("://*.");
    if (star > 0) {
      const scheme = entry.slice(0, star + 3);          // "https://"
      const suffix = entry.slice(star + 4);             // ".vercel.app"
      if (origin.startsWith(scheme) && origin.endsWith(suffix) &&
          origin.length > scheme.length + suffix.length) return origin;
    }
  }
  return null;
}

export function corsHeaders(origin) {
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

/* ---------- أرقام متسلسلة (RFQ-2026-0001 / Q-2026-0001) ---------- */
export async function nextSeq(db, name) {
  await db.prepare("INSERT INTO counters (name, value) VALUES (?, 0) ON CONFLICT(name) DO NOTHING").bind(name).run();
  await db.prepare("UPDATE counters SET value = value + 1 WHERE name = ?").bind(name).run();
  const row = await db.prepare("SELECT value FROM counters WHERE name = ?").bind(name).first();
  return row ? row.value : 1;
}

export async function makeRef(db, prefix, counterPrefix) {
  const year = new Date().getUTCFullYear();
  const n = await nextSeq(db, `${counterPrefix}:${year}`);
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export function randomToken(bytes = 18) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

export function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ---------- تنسيق ---------- */
export function money(n, currency = "USD") {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency;
}

export function fmtDate(iso, lang = "ar") {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const p = n => String(n).padStart(2, "0");
  const s = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  return lang === "ar" ? s : s;
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const p = n => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export function addDays(iso, days) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString();
}

/* ---------- استخراج البريد/الهاتف من حقل التواصل ---------- */
export function splitContact(raw) {
  const s = String(raw || "").trim();
  const email = (s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || null;
  let phone = null;
  const digits = s.replace(/[^\d+]/g, "");
  if (!email && digits.replace(/\D/g, "").length >= 8) phone = digits;
  else if (email) {
    const rest = s.replace(email, "");
    const d2 = rest.replace(/[^\d+]/g, "");
    if (d2.replace(/\D/g, "").length >= 8) phone = d2;
  }
  return { email, phone };
}

export function waLink(phone, text) {
  const p = String(phone || "").replace(/\D/g, "");
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text || "")}`;
}

/* ---------- تحديد المعدّل ---------- */
export async function rateLimit(db, key, { limit = 5, windowSec = 600 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare("SELECT hits, window_start FROM rate_limit WHERE k = ?").bind(key).first();
  if (!row || now - row.window_start > windowSec) {
    await db.prepare(
      "INSERT INTO rate_limit (k, hits, window_start) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET hits = 1, window_start = excluded.window_start"
    ).bind(key, now).run();
    return { ok: true, remaining: limit - 1 };
  }
  if (row.hits >= limit) return { ok: false, retryAfter: windowSec - (now - row.window_start) };
  await db.prepare("UPDATE rate_limit SET hits = hits + 1 WHERE k = ?").bind(key).run();
  return { ok: true, remaining: limit - row.hits - 1 };
}
