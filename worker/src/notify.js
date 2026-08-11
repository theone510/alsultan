// الإشعارات: تلغرام (فوري) + البريد عبر Resend. كلاهما اختياري — يُتجاهل إن لم تُضبط أسراره.

import { esc } from "./util.js";

export async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { skipped: true };
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function sendEmail(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY || !to) return { skipped: true };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: env.MAIL_FROM || "onboarding@resend.dev",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    const body = await r.text();
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* ---------- قوالب البريد ---------- */

const shell = (env, inner, dir = "rtl") => `<!doctype html>
<html dir="${dir}"><body style="margin:0;background:#0F0B07;padding:28px 12px;font-family:'Segoe UI',Tahoma,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:620px;background:#171009;border:1px solid #3A2A17;border-radius:14px;overflow:hidden">
      <tr><td style="padding:22px 26px;border-bottom:1px solid #3A2A17;text-align:${dir === "rtl" ? "right" : "left"}">
        <div style="color:#D9A441;font-size:20px;font-weight:700">${esc(env.BRAND_AR || "تمور السلطان")}</div>
        <div style="color:#9C7E4E;font-size:11px;letter-spacing:.28em;margin-top:4px">${esc(env.BRAND_EN || "ALSULTAN DATES")}</div>
      </td></tr>
      <tr><td style="padding:24px 26px;color:#EADFCE;font-size:15px;line-height:1.9;text-align:${dir === "rtl" ? "right" : "left"}">${inner}</td></tr>
      <tr><td style="padding:16px 26px;border-top:1px solid #3A2A17;color:#8A7350;font-size:12px;text-align:${dir === "rtl" ? "right" : "left"}">${esc(env.COMPANY_LINE_AR || "")} · ${esc(env.SALES_EMAIL || "")}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;

const row = (label, value) =>
  `<tr><td style="padding:7px 0;color:#9C7E4E;white-space:nowrap;vertical-align:top">${esc(label)}</td>
       <td style="padding:7px 12px;color:#EADFCE">${esc(value || "—")}</td></tr>`;

export function managerEmailHTML(env, r) {
  const inner = `
    <div style="color:#D9A441;font-size:17px;font-weight:700;margin-bottom:6px">طلب عرض سعر جديد — ${esc(r.ref)}</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
      ${row("الشركة", r.company)}
      ${row("الدولة", r.country)}
      ${row("الكمية", r.qty)}
      ${row("الدرجة", r.grade)}
      ${row("التعبئة", r.pack)}
      ${row("التواصل", r.contact)}
      ${row("ملاحظات", r.notes)}
    </table>
    <div style="margin-top:20px">
      <a href="${esc(env.PUBLIC_BASE_URL || "")}/admin/r/${esc(r.id)}"
         style="display:inline-block;background:#D9A441;color:#140D06;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700">
        فتح الطلب في لوحة التحكم
      </a>
    </div>`;
  return shell(env, inner);
}

export function ackEmailHTML(env, r, lang = "ar") {
  if (lang === "en") {
    const inner = `
      <div style="color:#D9A441;font-size:17px;font-weight:700;margin-bottom:8px">We received your request — ${esc(r.ref)}</div>
      <p style="margin:0 0 14px">Thank you for contacting Alsultan Dates. Our export team is reviewing your requirements and will come back to you with a formal quotation within one business day.</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
        ${row("Company", r.company)}${row("Country", r.country)}${row("Volume", r.qty)}
        ${row("Grade", r.grade)}${row("Packing", r.pack)}
      </table>
      <p style="margin:16px 0 0;color:#9C7E4E;font-size:13px">Please keep reference <b style="color:#EADFCE">${esc(r.ref)}</b> in any follow-up.</p>`;
    return shell(env, inner, "ltr");
  }
  const inner = `
    <div style="color:#D9A441;font-size:17px;font-weight:700;margin-bottom:8px">استلمنا طلبك — ${esc(r.ref)}</div>
    <p style="margin:0 0 14px">شكراً لتواصلك مع «تمور السلطان». فريق التصدير يراجع متطلباتك الآن، وسيصلك عرض سعر رسمي خلال يوم عمل واحد.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
      ${row("الشركة", r.company)}${row("الدولة", r.country)}${row("الكمية", r.qty)}
      ${row("الدرجة", r.grade)}${row("التعبئة", r.pack)}
    </table>
    <p style="margin:16px 0 0;color:#9C7E4E;font-size:13px">يرجى ذكر الرقم المرجعي <b style="color:#EADFCE">${esc(r.ref)}</b> في أي مراسلة.</p>`;
  return shell(env, inner);
}

export function quoteEmailHTML(env, q, link, lang = "ar") {
  if (lang === "en") {
    const inner = `
      <div style="color:#D9A441;font-size:17px;font-weight:700;margin-bottom:8px">Quotation ${esc(q.number)}</div>
      <p style="margin:0 0 16px">Dear ${esc(q.buyer_company)},<br/>Please find our formal quotation below. It is valid until <b>${esc(q.valid_until ? q.valid_until.slice(0, 10) : "—")}</b>.</p>
      <a href="${esc(link)}" style="display:inline-block;background:#D9A441;color:#140D06;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:700">View / download the quotation</a>
      <p style="margin:18px 0 0;color:#9C7E4E;font-size:13px">You can accept or decline directly on that page.</p>`;
    return shell(env, inner, "ltr");
  }
  const inner = `
    <div style="color:#D9A441;font-size:17px;font-weight:700;margin-bottom:8px">عرض سعر رقم ${esc(q.number)}</div>
    <p style="margin:0 0 16px">السادة ${esc(q.buyer_company)} المحترمين،<br/>يسرّنا أن نرفق لكم عرض السعر الرسمي. العرض صالح حتى <b>${esc(q.valid_until ? q.valid_until.slice(0, 10) : "—")}</b>.</p>
    <a href="${esc(link)}" style="display:inline-block;background:#D9A441;color:#140D06;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:700">عرض العرض / تحميله PDF</a>
    <p style="margin:18px 0 0;color:#9C7E4E;font-size:13px">يمكنكم القبول أو الاعتذار مباشرةً من الصفحة نفسها.</p>`;
  return shell(env, inner);
}

export function telegramText(env, r) {
  return [
    `🟡 <b>طلب عرض سعر جديد</b> — ${r.ref}`,
    ``,
    `🏢 <b>${r.company}</b> — ${r.country}`,
    `📦 ${r.qty} · ${r.grade}`,
    `🧰 ${r.pack}`,
    `📞 ${r.contact}`,
    r.notes ? `📝 ${r.notes}` : null,
    ``,
    `${env.PUBLIC_BASE_URL || ""}/admin/r/${r.id}`
  ].filter(Boolean).join("\n");
}
