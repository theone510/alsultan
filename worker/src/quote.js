// صفحة عرض السعر العلنية — رابط خاص للزبون، جاهزة للطباعة PDF (A4)، عربي/إنجليزي.

import { esc, html, redirect, nowISO, fmtDate, money } from "./util.js";

const T = {
  ar: {
    dir: "rtl", title: "عرض سعر", quotation: "عرض سعر", no: "رقم العرض", date: "التاريخ",
    validUntil: "صالح حتى", to: "إلى السادة", country: "الدولة", contact: "جهة التواصل",
    item: "الصنف", grade: "الدرجة", pack: "التعبئة", qty: "الكمية", unit: "الوحدة",
    price: "سعر الوحدة", lineTotal: "الإجمالي", subtotal: "المجموع", freight: "الشحن / التأمين",
    discount: "خصم", grand: "الإجمالي النهائي", terms: "الشروط", incoterm: "شرط التسليم",
    port: "الميناء / مكان التسليم", payment: "شروط الدفع", lead: "مدة التجهيز",
    notes: "ملاحظات", bank: "بيانات التحويل", print: "طباعة / حفظ PDF",
    accept: "قبول العرض", reject: "الاعتذار عن العرض", msg: "رسالة (اختياري)",
    thanksAccept: "شكراً لك. تم إبلاغ فريق المبيعات بقبولك، وسنتواصل معك لإتمام الإجراءات.",
    thanksReject: "شكراً لإبلاغنا. يسعدنا خدمتك في فرصة قادمة.",
    expired: "انتهت صلاحية هذا العرض. تواصل معنا لتحديثه.",
    respondedA: "تم قبول هذا العرض", respondedR: "تم الاعتذار عن هذا العرض",
    footer: "هذا العرض صادر إلكترونياً ولا يحتاج توقيعاً.",
    signature: "عن شركة تمور السلطان"
  },
  en: {
    dir: "ltr", title: "Quotation", quotation: "Quotation", no: "Quotation No.", date: "Date",
    validUntil: "Valid until", to: "To", country: "Country", contact: "Contact",
    item: "Item", grade: "Grade", pack: "Packing", qty: "Qty", unit: "Unit",
    price: "Unit price", lineTotal: "Amount", subtotal: "Subtotal", freight: "Freight / Insurance",
    discount: "Discount", grand: "Grand total", terms: "Terms", incoterm: "Incoterm",
    port: "Port / place of delivery", payment: "Payment terms", lead: "Lead time",
    notes: "Notes", bank: "Bank details", print: "Print / Save as PDF",
    accept: "Accept quotation", reject: "Decline", msg: "Message (optional)",
    thanksAccept: "Thank you. Our sales team has been notified and will contact you to proceed.",
    thanksReject: "Thank you for letting us know. We hope to serve you next time.",
    expired: "This quotation has expired. Please contact us for an updated one.",
    respondedA: "This quotation was accepted", respondedR: "This quotation was declined",
    footer: "This quotation is issued electronically and requires no signature.",
    signature: "For Alsultan Dates"
  }
};

const CSS = `
@page{size:A4;margin:14mm}
*{box-sizing:border-box}
body{margin:0;background:#0D0906;color:#EADFCE;font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;line-height:1.75}
.sheet{max-width:900px;margin:32px auto;background:#150F09;border:1px solid #3A2A17;border-radius:16px;padding:38px 40px}
.hd{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:1px solid #3A2A17;padding-bottom:22px;margin-bottom:26px}
.brand{font-size:27px;font-weight:700;color:#D9A441;line-height:1.25}
.brand small{display:block;font-size:11px;letter-spacing:.3em;color:#9C7E4E;font-weight:400;margin-top:4px}
.brand .cl{display:block;font-size:12px;color:#9C7E4E;margin-top:8px;letter-spacing:0}
.meta{text-align:end;font-size:14px}
.meta .t{font-size:20px;color:#D9A441;font-weight:700;margin-bottom:6px}
.meta div span{color:#9C7E4E}
h2{font-size:14px;color:#9C7E4E;font-weight:500;letter-spacing:.12em;margin:26px 0 10px;text-transform:uppercase}
.to{font-size:17px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
th{text-align:start;color:#9C7E4E;font-weight:500;font-size:12px;padding:10px 10px;border-bottom:1px solid #3A2A17}
td{padding:12px 10px;border-bottom:1px solid #2A1E12;vertical-align:top}
.num{text-align:end;white-space:nowrap}
.tot{margin-top:18px;margin-inline-start:auto;max-width:380px;font-size:15px}
.tot .l{display:flex;justify-content:space-between;padding:6px 0}
.tot .g{border-top:1px solid #3A2A17;margin-top:8px;padding-top:12px;font-size:20px;color:#D9A441;font-weight:700}
.terms{display:grid;gap:10px 24px;grid-template-columns:auto 1fr;font-size:14px;margin-top:6px}
.terms dt{color:#9C7E4E} .terms dd{margin:0}
.note{background:#1C140C;border:1px solid #2A1E12;border-radius:10px;padding:14px 16px;font-size:14px;white-space:pre-wrap}
.ft{margin-top:34px;border-top:1px solid #3A2A17;padding-top:18px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px;color:#9C7E4E}
.actions{max-width:900px;margin:0 auto 40px;padding:0 40px;display:flex;gap:12px;flex-wrap:wrap}
.btn{border:1px solid #D9A441;background:#D9A441;color:#140D06;border-radius:999px;padding:12px 26px;font:inherit;
  font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}
.btn.ghost{background:transparent;color:#F0C877}
.btn.no{border-color:#6B3A2F;color:#D69A8E;background:transparent}
.banner{max-width:900px;margin:0 auto 18px;padding:14px 20px;border:1px solid #3A2A17;background:#1C140C;border-radius:12px;font-size:14px}
.banner.ok{border-color:#2F6B41;background:rgba(78,140,90,.12);color:#8ED6A2}
.banner.bad{border-color:#6B3A2F;background:rgba(194,85,59,.1);color:#D69A8E}
dialog{background:#150F09;color:#EADFCE;border:1px solid #3A2A17;border-radius:14px;padding:24px;max-width:420px;width:92%}
dialog textarea{width:100%;background:#1C140C;border:1px solid #3A2A17;color:#EADFCE;border-radius:10px;padding:11px;font:inherit;min-height:90px}
@media print{
  body{background:#fff;color:#221A11}
  .actions,.no-print{display:none!important}
  .sheet{margin:0;border:none;border-radius:0;background:#fff;padding:0;max-width:none}
  .brand{color:#8A6320} .brand small,.brand .cl,th,.meta div span,.terms dt,.ft{color:#6E5C42}
  .meta .t,.tot .g{color:#8A6320}
  td{border-bottom:1px solid #E3D9C7} th{border-bottom:1px solid #C9B896}
  .note{background:#FAF6EF;border-color:#E3D9C7}
}
`;

export async function publicQuote(env, db, token, flags = {}) {
  const q = await db.prepare("SELECT * FROM quotes WHERE token = ?").bind(token).first();
  if (!q) return html("<h1 style='font-family:sans-serif;padding:40px'>الرابط غير صالح — Invalid link</h1>", { status: 404 });

  // تتبّع المشاهدة (لا نحتسب مشاهدات المدير عبر المعاينة)
  if (!flags.preview) {
    await db.prepare("UPDATE quotes SET view_count = view_count + 1, first_view_at = COALESCE(first_view_at, ?) WHERE id = ?")
      .bind(nowISO(), q.id).run();
  }

  const lang = (flags.lang === "en" || flags.lang === "ar") ? flags.lang : (q.lang === "en" ? "en" : "ar");
  const t = T[lang];
  const items = JSON.parse(q.items || "[]");
  const sub = items.reduce((a, it) => a + (Number(it.qty) * Number(it.price)), 0);
  const expired = q.valid_until && new Date(q.valid_until) < new Date() && q.status !== "accepted";
  const responded = q.status === "accepted" || q.status === "rejected";

  const banner = flags.done === "accepted" ? `<div class="banner ok">${esc(t.thanksAccept)}</div>`
    : flags.done === "rejected" ? `<div class="banner">${esc(t.thanksReject)}</div>`
    : responded ? `<div class="banner ${q.status === "accepted" ? "ok" : "bad"}">${esc(q.status === "accepted" ? t.respondedA : t.respondedR)}</div>`
    : expired ? `<div class="banner bad">${esc(t.expired)}</div>` : "";

  const body = `<!doctype html>
<html lang="${lang}" dir="${t.dir}">
<head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${esc(t.quotation)} ${esc(q.number)} · ${esc(env.BRAND_EN || "Alsultan Dates")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
${banner}
<div class="sheet">
  <div class="hd">
    <div class="brand">${esc(env.BRAND_AR || "تمور السلطان")}
      <small>${esc(env.BRAND_EN || "ALSULTAN DATES")}</small>
      <span class="cl">${esc(lang === "en" ? (env.COMPANY_LINE_EN || "") : (env.COMPANY_LINE_AR || ""))}</span>
      <span class="cl">${esc(env.SALES_EMAIL || "")}</span>
    </div>
    <div class="meta">
      <div class="t">${esc(t.quotation)}</div>
      <div><span>${esc(t.no)}:</span> <b>${esc(q.number)}</b></div>
      <div><span>${esc(t.date)}:</span> ${esc(fmtDate(q.created_at))}</div>
      <div><span>${esc(t.validUntil)}:</span> ${esc(fmtDate(q.valid_until))}</div>
    </div>
  </div>

  <h2>${esc(t.to)}</h2>
  <div class="to">${esc(q.buyer_company)}</div>
  <div style="font-size:14px;color:#9C7E4E">
    ${q.buyer_country ? `${esc(t.country)}: ${esc(q.buyer_country)}` : ""}
    ${q.buyer_contact ? ` · ${esc(t.contact)}: ${esc(q.buyer_contact)}` : ""}
  </div>

  <table>
    <thead><tr>
      <th>${esc(t.item)}</th><th class="num">${esc(t.qty)}</th>
      <th class="num">${esc(t.price)}</th><th class="num">${esc(t.lineTotal)}</th>
    </tr></thead>
    <tbody>
      ${items.map(it => `<tr>
        <td><b>${esc(it.desc)}</b>${(it.grade || it.pack) ? `<br/><span style="font-size:13px;color:#9C7E4E">${esc([it.grade, it.pack].filter(Boolean).join(" · "))}</span>` : ""}</td>
        <td class="num">${esc(it.qty)} ${esc(it.unit || "")}</td>
        <td class="num">${esc(money(it.price, q.currency))}</td>
        <td class="num">${esc(money(Number(it.qty) * Number(it.price), q.currency))}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="tot">
    <div class="l"><span>${esc(t.subtotal)}</span><b>${esc(money(sub, q.currency))}</b></div>
    ${Number(q.freight) ? `<div class="l"><span>${esc(t.freight)}</span><b>${esc(money(q.freight, q.currency))}</b></div>` : ""}
    ${Number(q.discount) ? `<div class="l"><span>${esc(t.discount)}</span><b>- ${esc(money(q.discount, q.currency))}</b></div>` : ""}
    <div class="l g"><span>${esc(t.grand)}</span><b>${esc(money(q.total, q.currency))}</b></div>
  </div>

  <h2>${esc(t.terms)}</h2>
  <dl class="terms">
    ${q.incoterm ? `<dt>${esc(t.incoterm)}</dt><dd>${esc(q.incoterm)}${q.port ? ` — ${esc(q.port)}` : ""}</dd>` : ""}
    ${q.payment_terms ? `<dt>${esc(t.payment)}</dt><dd>${esc(q.payment_terms)}</dd>` : ""}
    ${q.lead_time ? `<dt>${esc(t.lead)}</dt><dd>${esc(q.lead_time)}</dd>` : ""}
    <dt>${esc(t.validUntil)}</dt><dd>${esc(fmtDate(q.valid_until))}</dd>
  </dl>

  ${q.notes ? `<h2>${esc(t.notes)}</h2><div class="note">${esc(q.notes)}</div>` : ""}
  ${q.bank ? `<h2>${esc(t.bank)}</h2><div class="note">${esc(q.bank)}</div>` : ""}

  <div class="ft">
    <div>${esc(t.footer)}</div>
    <div>${esc(t.signature)}</div>
  </div>
</div>

<div class="actions">
  <button class="btn ghost" onclick="window.print()">${esc(t.print)}</button>
  <a class="btn ghost" href="?lang=${lang === "ar" ? "en" : "ar"}">${lang === "ar" ? "English" : "العربية"}</a>
  ${(!responded && !expired) ? `
    <form method="post" action="/q/${esc(q.token)}/respond" style="display:inline">
      <input type="hidden" name="decision" value="accepted" />
      <button class="btn" type="submit">${esc(t.accept)}</button>
    </form>
    <button class="btn no" type="button" onclick="document.getElementById('dg').showModal()">${esc(t.reject)}</button>` : ""}
</div>

${(!responded && !expired) ? `<dialog id="dg">
  <form method="post" action="/q/${esc(q.token)}/respond">
    <input type="hidden" name="decision" value="rejected" />
    <label style="display:block;margin-bottom:8px;color:#9C7E4E;font-size:14px">${esc(t.msg)}</label>
    <textarea name="message"></textarea>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button class="btn no" type="submit">${esc(t.reject)}</button>
      <button class="btn ghost" type="button" onclick="document.getElementById('dg').close()">×</button>
    </div>
  </form>
</dialog>` : ""}
</body></html>`;
  return html(body);
}

export async function respondQuote(env, db, token, form, ctx) {
  const q = await db.prepare("SELECT * FROM quotes WHERE token = ?").bind(token).first();
  if (!q) return redirect("/");
  if (q.status === "accepted" || q.status === "rejected") return redirect(`/q/${token}`);

  const decision = form.get("decision") === "accepted" ? "accepted" : "rejected";
  const message = String(form.get("message") || "").slice(0, 2000);
  const now = nowISO();

  await db.prepare("UPDATE quotes SET status = ?, responded_at = ?, buyer_message = ?, updated_at = ? WHERE id = ?")
    .bind(decision, now, message, now, q.id).run();

  if (q.request_id) {
    await db.prepare("UPDATE requests SET status = ?, updated_at = ? WHERE id = ?")
      .bind(decision === "accepted" ? "won" : "lost", now, q.request_id).run();
  }

  // إشعار المدير
  const { sendTelegram, sendEmail } = await import("./notify.js");
  const txt = decision === "accepted"
    ? `✅ <b>قبول عرض سعر</b> — ${q.number}\n${q.buyer_company} (${q.buyer_country || ""})\nالإجمالي: ${money(q.total, q.currency)}${message ? `\n📝 ${message}` : ""}\n\n${env.PUBLIC_BASE_URL || ""}/admin/q/${q.id}`
    : `❌ <b>اعتذار عن عرض سعر</b> — ${q.number}\n${q.buyer_company}${message ? `\n📝 ${message}` : ""}\n\n${env.PUBLIC_BASE_URL || ""}/admin/q/${q.id}`;
  const p = Promise.all([
    sendTelegram(env, txt),
    sendEmail(env, {
      to: env.MAIL_TO,
      subject: `${decision === "accepted" ? "قبول" : "اعتذار"} — عرض ${q.number} (${q.buyer_company})`,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${esc(txt.replace(/<\/?b>/g, ""))}</pre>`
    })
  ]);
  if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;

  return redirect(`/q/${token}?done=${decision}`);
}
