// هيكل وأنماط لوحة التحكم (بهوية «تمور السلطان»)

import { esc } from "./util.js";

export const CSS = `
:root{
  --bg:#0D0906; --panel:#150F09; --panel2:#1C140C; --line:#3A2A17; --line-soft:#2A1E12;
  --gold:#D9A441; --gold-bright:#F0C877; --ivory:#EADFCE; --muted:#9C7E4E; --danger:#C2553B;
  --ok:#4E8C5A; --warn:#B5722F;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ivory);
  font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;font-size:15px;line-height:1.7}
a{color:var(--gold-bright);text-decoration:none} a:hover{text-decoration:underline}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px 80px}
header.top{position:sticky;top:0;z-index:20;background:rgba(13,9,6,.92);backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line-soft)}
header.top .in{max-width:1180px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.brand{font-weight:700;color:var(--gold);font-size:19px}
.brand small{display:block;font-size:10px;letter-spacing:.3em;color:var(--muted);font-weight:400}
header.top nav{display:flex;gap:16px;margin-inline-start:auto;flex-wrap:wrap;align-items:center}
header.top nav a{color:var(--ivory);font-size:14px;opacity:.85} header.top nav a:hover{opacity:1;color:var(--gold-bright)}
h1{font-size:24px;margin:6px 0 4px;color:var(--gold)} h2{font-size:18px;color:var(--gold);margin:26px 0 12px}
.sub{color:var(--muted);font-size:14px;margin:0 0 20px}
.card{background:var(--panel);border:1px solid var(--line-soft);border-radius:14px;padding:20px 22px;margin-bottom:18px}
.grid{display:grid;gap:14px}
@media(min-width:760px){.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}}
label{display:block;font-size:13px;color:var(--muted);margin-bottom:6px}
input,select,textarea{width:100%;background:var(--panel2);border:1px solid var(--line);color:var(--ivory);
  border-radius:10px;padding:11px 13px;font:inherit;font-size:14px}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(217,164,65,.13)}
textarea{min-height:96px;resize:vertical}
.btn{display:inline-block;border:1px solid var(--gold);background:var(--gold);color:#140D06;border-radius:999px;
  padding:11px 24px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:.25s}
.btn:hover{background:var(--gold-bright);text-decoration:none}
.btn.ghost{background:transparent;color:var(--gold-bright)} .btn.ghost:hover{background:rgba(217,164,65,.12)}
.btn.sm{padding:7px 16px;font-size:13px}
.btn.danger{border-color:var(--danger);background:transparent;color:#E08a72}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
table{width:100%;border-collapse:collapse;font-size:14px}
th{ text-align:start;color:var(--muted);font-weight:500;font-size:12px;letter-spacing:.06em;
  padding:10px 12px;border-bottom:1px solid var(--line)}
td{padding:12px;border-bottom:1px solid var(--line-soft);vertical-align:top}
tr:hover td{background:rgba(217,164,65,.04)}
.tag{display:inline-block;padding:3px 11px;border-radius:999px;font-size:12px;border:1px solid var(--line);white-space:nowrap}
.t-new{color:#F0C877;border-color:#7A5A22;background:rgba(217,164,65,.12)}
.t-contacted{color:#8FB6D6;border-color:#33536B;background:rgba(96,150,190,.12)}
.t-quoted{color:#C9A2E0;border-color:#5A3F6B;background:rgba(160,110,200,.12)}
.t-won{color:#8ED6A2;border-color:#2F6B41;background:rgba(78,140,90,.14)}
.t-lost{color:#D69A8E;border-color:#6B3A2F;background:rgba(194,85,59,.12)}
.t-draft{color:#B8A88F;border-color:#4A3E2E;background:rgba(200,180,150,.08)}
.t-sent{color:#8FB6D6;border-color:#33536B;background:rgba(96,150,190,.12)}
.t-accepted{color:#8ED6A2;border-color:#2F6B41;background:rgba(78,140,90,.14)}
.t-rejected{color:#D69A8E;border-color:#6B3A2F;background:rgba(194,85,59,.12)}
.t-expired{color:#9C8A72;border-color:#4A3E2E}
.stat{background:var(--panel);border:1px solid var(--line-soft);border-radius:14px;padding:16px 18px}
.stat .n{font-size:28px;color:var(--gold);font-weight:700;line-height:1.2}
.stat .l{font-size:13px;color:var(--muted)}
.kv{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;font-size:14px}
.kv dt{color:var(--muted)} .kv dd{margin:0}
.muted{color:var(--muted)} .small{font-size:13px}
.empty{text-align:center;color:var(--muted);padding:44px 10px}
.notice{border:1px solid var(--line);background:rgba(217,164,65,.07);border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:14px}
.notice.bad{border-color:#6B3A2F;background:rgba(194,85,59,.1)}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.filters a{border:1px solid var(--line);border-radius:999px;padding:6px 15px;font-size:13px;color:var(--ivory)}
.filters a.on{background:var(--gold);color:#140D06;border-color:var(--gold);font-weight:700}
.filters a:hover{text-decoration:none;border-color:var(--gold)}
.itemrow{display:grid;gap:10px;grid-template-columns:1fr;border:1px solid var(--line-soft);border-radius:12px;padding:14px;margin-bottom:12px;background:var(--panel2)}
@media(min-width:880px){.itemrow{grid-template-columns:2.2fr 1fr 1fr .9fr 1.1fr auto;align-items:end}}
.totbox{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:16px 18px;font-size:15px}
.totbox .line{display:flex;justify-content:space-between;padding:5px 0}
.totbox .grand{border-top:1px solid var(--line);margin-top:8px;padding-top:12px;font-size:19px;color:var(--gold);font-weight:700}
code.copy{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 11px;font-size:13px;
  display:inline-block;word-break:break-all;max-width:100%}
`;

export function layout({ title, body, authed = true, env = {}, active = "" }) {
  const nav = authed ? `
    <nav>
      <a href="/admin" ${active === "requests" ? 'style="color:var(--gold-bright)"' : ""}>الطلبات</a>
      <a href="/admin/quotes" ${active === "quotes" ? 'style="color:var(--gold-bright)"' : ""}>عروض الأسعار</a>
      <a href="/admin/export.csv">تصدير Excel</a>
      <form method="post" action="/admin/logout" style="display:inline">
        <button class="btn ghost sm" type="submit">خروج</button>
      </form>
    </nav>` : "";
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>${esc(title)} · ${esc(env.BRAND_AR || "تمور السلطان")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="in">
  <div class="brand">${esc(env.BRAND_AR || "تمور السلطان")}<small>${esc(env.BRAND_EN || "ALSULTAN DATES")}</small></div>
  ${nav}
</div></header>
<div class="wrap">${body}</div>
</body></html>`;
}

export const STATUS_AR = {
  new: "جديد", contacted: "تم التواصل", quoted: "أُرسل عرض", won: "تم البيع", lost: "خسرنا"
};
export const QSTATUS_AR = {
  draft: "مسودة", sent: "أُرسل", accepted: "مقبول", rejected: "مرفوض", expired: "منتهي"
};

export const tag = (status, map) => `<span class="tag t-${esc(status)}">${esc((map || STATUS_AR)[status] || status)}</span>`;
