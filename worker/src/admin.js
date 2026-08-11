// لوحة التحكم: الطلبات + بناء عروض الأسعار

import {
  esc, html, json, redirect, nowISO, fmtDate, fmtDateTime, money,
  makeRef, randomToken, addDays, waLink
} from "./util.js";
import { layout, tag, STATUS_AR, QSTATUS_AR } from "./ui.js";
import { sendEmail, quoteEmailHTML } from "./notify.js";

/* ============================ الدخول ============================ */

export function loginPage(env, { error } = {}) {
  const body = `
  <div style="max-width:420px;margin:8vh auto">
    <div class="card">
      <h1 style="margin-top:0">لوحة تحكم الطلبات</h1>
      <p class="sub">أدخل كلمة المرور للدخول إلى طلبات عروض الأسعار.</p>
      ${error ? `<div class="notice bad">${esc(error)}</div>` : ""}
      <form method="post" action="/admin/login">
        <label for="p">كلمة المرور</label>
        <input id="p" name="password" type="password" autocomplete="current-password" required autofocus />
        <div style="margin-top:16px"><button class="btn" type="submit">دخول</button></div>
      </form>
    </div>
  </div>`;
  return html(layout({ title: "دخول", body, authed: false, env }));
}

/* ============================ الطلبات ============================ */

export async function dashboard(env, db, url) {
  const status = url.searchParams.get("status") || "";
  const q = (url.searchParams.get("q") || "").trim();

  let sql = "SELECT * FROM requests";
  const where = [], binds = [];
  if (status && STATUS_AR[status]) { where.push("status = ?"); binds.push(status); }
  if (q) {
    where.push("(company LIKE ? OR country LIKE ? OR contact LIKE ? OR ref LIKE ? OR notes LIKE ?)");
    for (let i = 0; i < 5; i++) binds.push(`%${q}%`);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY created_at DESC LIMIT 300";

  const { results = [] } = await db.prepare(sql).bind(...binds).all();
  const counts = await db.prepare(
    "SELECT status, COUNT(*) AS n FROM requests GROUP BY status"
  ).all();
  const cmap = {};
  for (const r of counts.results || []) cmap[r.status] = r.n;
  const total = Object.values(cmap).reduce((a, b) => a + b, 0);
  const openQuotes = await db.prepare("SELECT COUNT(*) AS n FROM quotes WHERE status = 'sent'").first();

  const chip = (key, label) =>
    `<a class="${status === key ? "on" : ""}" href="/admin${key ? `?status=${key}` : ""}">${esc(label)}${
      key ? ` (${cmap[key] || 0})` : ` (${total})`}</a>`;

  const rows = results.map(r => `
    <tr>
      <td class="small muted" style="white-space:nowrap">${esc(r.ref)}<br/><span style="opacity:.7">${esc(fmtDate(r.created_at))}</span></td>
      <td><a href="/admin/r/${r.id}"><b>${esc(r.company)}</b></a><br/><span class="small muted">${esc(r.country)}</span></td>
      <td class="small">${esc(r.qty)}<br/><span class="muted">${esc(r.grade)}</span></td>
      <td class="small">${esc(r.pack)}</td>
      <td class="small">${esc(r.contact)}</td>
      <td>${tag(r.status)}</td>
      <td style="white-space:nowrap"><a class="btn ghost sm" href="/admin/r/${r.id}">فتح</a></td>
    </tr>`).join("");

  const body = `
  <h1>طلبات عروض الأسعار</h1>
  <p class="sub">كل طلب يصل من الموقع يُحفظ هنا تلقائياً — لا شيء يضيع.</p>

  <div class="grid g4" style="margin-bottom:22px">
    <div class="stat"><div class="n">${cmap.new || 0}</div><div class="l">طلبات جديدة</div></div>
    <div class="stat"><div class="n">${cmap.contacted || 0}</div><div class="l">قيد التواصل</div></div>
    <div class="stat"><div class="n">${(openQuotes && openQuotes.n) || 0}</div><div class="l">عروض بانتظار الرد</div></div>
    <div class="stat"><div class="n">${cmap.won || 0}</div><div class="l">صفقات مُنجزة</div></div>
  </div>

  <div class="filters">
    ${chip("", "الكل")}${chip("new", "جديد")}${chip("contacted", "تم التواصل")}
    ${chip("quoted", "أُرسل عرض")}${chip("won", "تم البيع")}${chip("lost", "خسرنا")}
  </div>

  <form method="get" action="/admin" class="row" style="margin-bottom:16px">
    ${status ? `<input type="hidden" name="status" value="${esc(status)}" />` : ""}
    <input name="q" value="${esc(q)}" placeholder="بحث: شركة، دولة، بريد، رقم مرجعي…" style="max-width:340px" />
    <button class="btn ghost sm" type="submit">بحث</button>
    ${q ? `<a class="btn ghost sm" href="/admin">إلغاء</a>` : ""}
  </form>

  <div class="card" style="padding:6px 8px">
    ${results.length ? `<table>
      <thead><tr><th>المرجع</th><th>الشركة</th><th>الكمية / الدرجة</th><th>التعبئة</th><th>التواصل</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>`
      : `<div class="empty">لا توجد طلبات بعد.</div>`}
  </div>`;
  return html(layout({ title: "الطلبات", body, env, active: "requests" }));
}

export async function requestDetail(env, db, id, { saved } = {}) {
  const r = await db.prepare("SELECT * FROM requests WHERE id = ?").bind(id).first();
  if (!r) return html(layout({ title: "غير موجود", body: `<div class="empty">الطلب غير موجود.</div>`, env }), { status: 404 });

  const { results: quotes = [] } = await db.prepare(
    "SELECT id, number, status, total, currency, created_at FROM quotes WHERE request_id = ? ORDER BY created_at DESC"
  ).bind(id).all();

  const wa = r.contact_phone ? waLink(r.contact_phone,
    `السلام عليكم، بخصوص طلبكم رقم ${r.ref} لدى «تمور السلطان» — نود تزويدكم بعرض السعر.`) : null;

  const body = `
  <p class="small"><a href="/admin">→ رجوع إلى الطلبات</a></p>
  ${saved ? `<div class="notice">تم حفظ التغييرات.</div>` : ""}
  <h1>${esc(r.company)} <span class="muted" style="font-size:16px">— ${esc(r.ref)}</span></h1>
  <p class="sub">وصل بتاريخ ${esc(fmtDateTime(r.created_at))} · اللغة: ${r.lang === "en" ? "الإنجليزية" : "العربية"}</p>

  <div class="grid g2">
    <div class="card">
      <h2 style="margin-top:0">تفاصيل الطلب</h2>
      <dl class="kv">
        <dt>الشركة</dt><dd>${esc(r.company)}</dd>
        <dt>الدولة</dt><dd>${esc(r.country)}</dd>
        <dt>الكمية</dt><dd>${esc(r.qty)}</dd>
        <dt>الدرجة</dt><dd>${esc(r.grade)}</dd>
        <dt>التعبئة</dt><dd>${esc(r.pack)}</dd>
        <dt>التواصل</dt><dd>${esc(r.contact)}</dd>
        <dt>ملاحظات</dt><dd>${esc(r.notes || "—")}</dd>
        <dt>الحالة</dt><dd>${tag(r.status)}</dd>
      </dl>
      <div class="row" style="margin-top:18px">
        ${r.contact_email ? `<a class="btn ghost sm" href="mailto:${esc(r.contact_email)}?subject=${encodeURIComponent(r.ref)}">مراسلة بالبريد</a>` : ""}
        ${wa ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(wa)}">مراسلة واتساب</a>` : ""}
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">المتابعة</h2>
      <form method="post" action="/admin/r/${r.id}">
        <label for="st">الحالة</label>
        <select id="st" name="status">
          ${Object.entries(STATUS_AR).map(([k, v]) =>
            `<option value="${k}" ${r.status === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
        </select>
        <div style="height:14px"></div>
        <label for="nt">ملاحظات داخلية (لا يراها الزبون)</label>
        <textarea id="nt" name="internal_notes">${esc(r.internal_notes || "")}</textarea>
        <div style="margin-top:14px"><button class="btn" type="submit">حفظ</button></div>
      </form>
    </div>
  </div>

  <div class="card">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">عروض الأسعار لهذا الطلب</h2>
      <a class="btn" href="/admin/quote/new?request=${r.id}">+ إنشاء عرض سعر</a>
    </div>
    ${quotes.length ? `<table style="margin-top:14px">
      <thead><tr><th>الرقم</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${quotes.map(qq => `<tr>
        <td><a href="/admin/q/${qq.id}">${esc(qq.number)}</a></td>
        <td class="small muted">${esc(fmtDate(qq.created_at))}</td>
        <td>${esc(money(qq.total, qq.currency))}</td>
        <td>${tag(qq.status, QSTATUS_AR)}</td>
        <td><a class="btn ghost sm" href="/admin/q/${qq.id}">فتح</a></td></tr>`).join("")}
      </tbody></table>` : `<p class="muted small" style="margin-bottom:0">لا يوجد عرض سعر بعد لهذا الطلب.</p>`}
  </div>`;
  return html(layout({ title: r.company, body, env, active: "requests" }));
}

export async function updateRequest(env, db, id, form) {
  const status = String(form.get("status") || "new");
  const notes = String(form.get("internal_notes") || "");
  await db.prepare("UPDATE requests SET status = ?, internal_notes = ?, updated_at = ? WHERE id = ?")
    .bind(STATUS_AR[status] ? status : "new", notes, nowISO(), id).run();
  return redirect(`/admin/r/${id}?saved=1`);
}

/* ============================ عروض الأسعار ============================ */

export async function quotesList(env, db) {
  const { results = [] } = await db.prepare(
    "SELECT * FROM quotes ORDER BY created_at DESC LIMIT 300"
  ).all();
  const body = `
  <h1>عروض الأسعار</h1>
  <p class="sub">كل عرض له رقم متسلسل ورابط خاص بالزبون، ونعرف متى فتحه.</p>
  <div class="card" style="padding:6px 8px">
  ${results.length ? `<table>
    <thead><tr><th>الرقم</th><th>الزبون</th><th>الإجمالي</th><th>صالح حتى</th><th>الحالة</th><th>المشاهدات</th><th></th></tr></thead>
    <tbody>${results.map(q => `<tr>
      <td><a href="/admin/q/${q.id}"><b>${esc(q.number)}</b></a><br/><span class="small muted">${esc(fmtDate(q.created_at))}</span></td>
      <td>${esc(q.buyer_company)}<br/><span class="small muted">${esc(q.buyer_country || "")}</span></td>
      <td>${esc(money(q.total, q.currency))}</td>
      <td class="small">${esc(fmtDate(q.valid_until))}</td>
      <td>${tag(q.status, QSTATUS_AR)}</td>
      <td class="small muted">${q.view_count || 0}${q.first_view_at ? `<br/>${esc(fmtDate(q.first_view_at))}` : ""}</td>
      <td><a class="btn ghost sm" href="/admin/q/${q.id}">فتح</a></td></tr>`).join("")}
    </tbody></table>` : `<div class="empty">لا توجد عروض أسعار بعد. افتح طلباً ثم اضغط «إنشاء عرض سعر».</div>`}
  </div>`;
  return html(layout({ title: "عروض الأسعار", body, env, active: "quotes" }));
}

const DEFAULT_ITEM = { desc: "", qty: "", unit: "طن", price: "" };

function itemRow(i, it = DEFAULT_ITEM) {
  return `
  <div class="itemrow">
    <div><label>الوصف / الصنف</label><input name="i_desc" value="${esc(it.desc)}" placeholder="تمر زهدي عراقي — الدرجة الأولى" /></div>
    <div><label>الدرجة</label><input name="i_grade" value="${esc(it.grade || "")}" placeholder="Grade A" /></div>
    <div><label>التعبئة</label><input name="i_pack" value="${esc(it.pack || "")}" placeholder="كرتون 10 كغ" /></div>
    <div><label>الكمية</label><input name="i_qty" type="number" step="0.01" value="${esc(it.qty)}" /></div>
    <div><label>الوحدة</label>
      <select name="i_unit">
        ${["طن", "كغ", "كرتون", "كيس", "حاوية"].map(u => `<option ${it.unit === u ? "selected" : ""}>${u}</option>`).join("")}
      </select></div>
    <div><label>سعر الوحدة</label><input name="i_price" type="number" step="0.01" value="${esc(it.price)}" /></div>
    <div><button type="button" class="btn danger sm" onclick="this.closest('.itemrow').remove();recalc()">حذف</button></div>
  </div>`;
}

const CALC_JS = `
function recalc(){
  var rows=document.querySelectorAll('#items .itemrow'), sub=0;
  rows.forEach(function(r){
    var q=parseFloat(r.querySelector('[name=i_qty]').value||0);
    var p=parseFloat(r.querySelector('[name=i_price]').value||0);
    sub += (isNaN(q)?0:q)*(isNaN(p)?0:p);
  });
  var fr=parseFloat(document.getElementById('freight').value||0)||0;
  var ds=parseFloat(document.getElementById('discount').value||0)||0;
  var cur=document.getElementById('currency').value||'USD';
  var f=function(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+cur;};
  document.getElementById('t-sub').textContent=f(sub);
  document.getElementById('t-fr').textContent=f(fr);
  document.getElementById('t-ds').textContent='- '+f(ds);
  document.getElementById('t-gr').textContent=f(sub+fr-ds);
}
document.addEventListener('input',function(e){ if(e.target.closest('#items')||['freight','discount','currency'].indexOf(e.target.id)>=0) recalc(); });
document.addEventListener('change',function(e){ if(e.target.id==='currency') recalc(); });
function addItem(){
  var t=document.getElementById('tpl').innerHTML;
  var d=document.createElement('div'); d.innerHTML=t;
  document.getElementById('items').appendChild(d.firstElementChild); recalc();
}
window.addEventListener('DOMContentLoaded',recalc);
`;

export async function quoteForm(env, db, url, { quote } = {}) {
  const requestId = url.searchParams.get("request");
  let req = null;
  if (quote && quote.request_id) req = await db.prepare("SELECT * FROM requests WHERE id = ?").bind(quote.request_id).first();
  else if (requestId) req = await db.prepare("SELECT * FROM requests WHERE id = ?").bind(requestId).first();

  const items = quote ? JSON.parse(quote.items || "[]") : [];
  if (!items.length) {
    items.push({
      desc: "تمر زهدي عراقي — كربلاء",
      grade: req ? req.grade : "",
      pack: req ? req.pack : "",
      qty: "", unit: "طن", price: ""
    });
  }

  const v = (k, d = "") => esc(quote ? (quote[k] == null ? d : quote[k]) : d);
  const editing = !!quote;

  const body = `
  <p class="small"><a href="${editing ? `/admin/q/${quote.id}` : req ? `/admin/r/${req.id}` : "/admin"}">→ رجوع</a></p>
  <h1>${editing ? `تعديل عرض السعر ${esc(quote.number)}` : "إنشاء عرض سعر"}</h1>
  <p class="sub">${req ? `للطلب ${esc(req.ref)} — ${esc(req.company)} (${esc(req.country)})` : "عرض سعر جديد"}</p>

  <form method="post" action="${editing ? `/admin/q/${quote.id}/update` : "/admin/quote/new"}">
    ${req ? `<input type="hidden" name="request_id" value="${req.id}" />` : ""}

    <div class="card">
      <h2 style="margin-top:0">بيانات الزبون</h2>
      <div class="grid g3">
        <div><label>اسم الشركة *</label><input name="buyer_company" required value="${v("buyer_company", req ? req.company : "")}" /></div>
        <div><label>الدولة</label><input name="buyer_country" value="${v("buyer_country", req ? req.country : "")}" /></div>
        <div><label>جهة التواصل (بريد / واتساب)</label><input name="buyer_contact" value="${v("buyer_contact", req ? req.contact : "")}" /></div>
      </div>
      <div class="grid g3" style="margin-top:14px">
        <div><label>لغة العرض</label>
          <select name="lang">
            <option value="ar" ${(quote ? quote.lang : req && req.lang) === "ar" ? "selected" : ""}>العربية</option>
            <option value="en" ${(quote ? quote.lang : req && req.lang) === "en" ? "selected" : ""}>English</option>
          </select></div>
        <div><label>العملة</label>
          <select id="currency" name="currency">
            ${["USD", "EUR", "AED", "IQD"].map(c =>
              `<option ${(quote ? quote.currency : env.DEFAULT_CURRENCY || "USD") === c ? "selected" : ""}>${c}</option>`).join("")}
          </select></div>
        <div><label>صلاحية العرض (يوم)</label><input name="validity_days" type="number" min="1" value="${v("validity_days", "14")}" /></div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">شروط التسليم</h2>
      <div class="grid g4">
        <div><label>Incoterm</label>
          <select name="incoterm">
            ${["FOB", "CFR", "CIF", "EXW", "DAP", "FCA"].map(t =>
              `<option ${v("incoterm", "FOB") === t ? "selected" : ""}>${t}</option>`).join("")}
          </select></div>
        <div><label>الميناء / مكان التسليم</label><input name="port" value="${v("port", "Umm Qasr, Iraq")}" /></div>
        <div><label>شروط الدفع</label><input name="payment_terms" value="${v("payment_terms", "30% مقدماً + 70% مقابل مستندات الشحن")}" /></div>
        <div><label>مدة التجهيز</label><input name="lead_time" value="${v("lead_time", "10 – 14 يوم عمل")}" /></div>
      </div>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between">
        <h2 style="margin:0">بنود العرض</h2>
        <button type="button" class="btn ghost sm" onclick="addItem()">+ إضافة بند</button>
      </div>
      <div id="items" style="margin-top:14px">${items.map((it, i) => itemRow(i, it)).join("")}</div>

      <div class="grid g2" style="margin-top:8px">
        <div>
          <div class="grid g2">
            <div><label>الشحن / التأمين</label><input id="freight" name="freight" type="number" step="0.01" value="${v("freight", "0")}" /></div>
            <div><label>خصم</label><input id="discount" name="discount" type="number" step="0.01" value="${v("discount", "0")}" /></div>
          </div>
        </div>
        <div class="totbox">
          <div class="line"><span>المجموع</span><b id="t-sub">—</b></div>
          <div class="line"><span>الشحن / التأمين</span><b id="t-fr">—</b></div>
          <div class="line"><span>الخصم</span><b id="t-ds">—</b></div>
          <div class="line grand"><span>الإجمالي</span><b id="t-gr">—</b></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">ملاحظات وبيانات التحويل</h2>
      <div class="grid g2">
        <div><label>ملاحظات تظهر في العرض</label><textarea name="notes">${v("notes", "الأسعار بالدولار الأمريكي. العينة المعتمدة هي المرجع في المطابقة عند التحميل.")}</textarea></div>
        <div><label>بيانات الحساب البنكي</label><textarea name="bank">${v("bank", "")}</textarea></div>
      </div>
    </div>

    <div class="row">
      <button class="btn" type="submit">${editing ? "حفظ التعديلات" : "حفظ العرض"}</button>
      <a class="btn ghost" href="${editing ? `/admin/q/${quote.id}` : req ? `/admin/r/${req.id}` : "/admin"}">إلغاء</a>
    </div>
  </form>

  <template id="tpl">${itemRow(999, DEFAULT_ITEM)}</template>
  <script>${CALC_JS}</script>`;
  return html(layout({ title: editing ? "تعديل عرض" : "عرض سعر جديد", body, env, active: "quotes" }));
}

function collectItems(form) {
  const desc = form.getAll("i_desc"), grade = form.getAll("i_grade"), pack = form.getAll("i_pack");
  const qty = form.getAll("i_qty"), unit = form.getAll("i_unit"), price = form.getAll("i_price");
  const items = [];
  for (let i = 0; i < desc.length; i++) {
    const q = parseFloat(qty[i] || 0) || 0, p = parseFloat(price[i] || 0) || 0;
    if (!String(desc[i] || "").trim() && !q && !p) continue;
    items.push({
      desc: String(desc[i] || "").trim(),
      grade: String(grade[i] || "").trim(),
      pack: String(pack[i] || "").trim(),
      qty: q, unit: String(unit[i] || "").trim(), price: p, line: +(q * p).toFixed(2)
    });
  }
  return items;
}

function totalsOf(items, freight, discount) {
  const sub = items.reduce((a, it) => a + (it.qty * it.price), 0);
  return +(sub + (freight || 0) - (discount || 0)).toFixed(2);
}

export async function createQuote(env, db, form) {
  const items = collectItems(form);
  const freight = parseFloat(form.get("freight") || 0) || 0;
  const discount = parseFloat(form.get("discount") || 0) || 0;
  const validity = parseInt(form.get("validity_days") || "14", 10) || 14;
  const now = nowISO();
  const number = await makeRef(db, "Q", "quote");
  const token = randomToken();

  const r = await db.prepare(`INSERT INTO quotes
    (number, token, request_id, buyer_company, buyer_country, buyer_contact, lang, currency,
     incoterm, port, payment_terms, lead_time, validity_days, valid_until, items, freight, discount, total,
     notes, bank, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?)`)
    .bind(
      number, token, form.get("request_id") || null,
      String(form.get("buyer_company") || "").trim(),
      String(form.get("buyer_country") || "").trim(),
      String(form.get("buyer_contact") || "").trim(),
      form.get("lang") === "en" ? "en" : "ar",
      String(form.get("currency") || env.DEFAULT_CURRENCY || "USD"),
      String(form.get("incoterm") || ""), String(form.get("port") || ""),
      String(form.get("payment_terms") || ""), String(form.get("lead_time") || ""),
      validity, addDays(now, validity), JSON.stringify(items), freight, discount,
      totalsOf(items, freight, discount),
      String(form.get("notes") || ""), String(form.get("bank") || ""), now, now
    ).run();

  const id = r.meta && r.meta.last_row_id;
  const reqId = form.get("request_id");
  if (reqId) {
    await db.prepare("UPDATE requests SET status = CASE WHEN status IN ('new','contacted') THEN 'quoted' ELSE status END, updated_at = ? WHERE id = ?")
      .bind(now, reqId).run();
  }
  return redirect(`/admin/q/${id}?created=1`);
}

export async function updateQuote(env, db, id, form) {
  const items = collectItems(form);
  const freight = parseFloat(form.get("freight") || 0) || 0;
  const discount = parseFloat(form.get("discount") || 0) || 0;
  const validity = parseInt(form.get("validity_days") || "14", 10) || 14;
  const q = await db.prepare("SELECT created_at FROM quotes WHERE id = ?").bind(id).first();
  const base = (q && q.created_at) || nowISO();

  await db.prepare(`UPDATE quotes SET buyer_company=?, buyer_country=?, buyer_contact=?, lang=?, currency=?,
      incoterm=?, port=?, payment_terms=?, lead_time=?, validity_days=?, valid_until=?, items=?, freight=?, discount=?,
      total=?, notes=?, bank=?, updated_at=? WHERE id = ?`)
    .bind(
      String(form.get("buyer_company") || "").trim(),
      String(form.get("buyer_country") || "").trim(),
      String(form.get("buyer_contact") || "").trim(),
      form.get("lang") === "en" ? "en" : "ar",
      String(form.get("currency") || "USD"),
      String(form.get("incoterm") || ""), String(form.get("port") || ""),
      String(form.get("payment_terms") || ""), String(form.get("lead_time") || ""),
      validity, addDays(base, validity), JSON.stringify(items), freight, discount,
      totalsOf(items, freight, discount),
      String(form.get("notes") || ""), String(form.get("bank") || ""), nowISO(), id
    ).run();
  return redirect(`/admin/q/${id}?saved=1`);
}

export async function quoteAdminView(env, db, id, flags = {}) {
  const q = await db.prepare("SELECT * FROM quotes WHERE id = ?").bind(id).first();
  if (!q) return html(layout({ title: "غير موجود", body: `<div class="empty">العرض غير موجود.</div>`, env }), { status: 404 });

  const link = `${env.PUBLIC_BASE_URL || ""}/q/${q.token}`;
  const items = JSON.parse(q.items || "[]");
  const isAr = q.lang !== "en";
  const waText = isAr
    ? `السلام عليكم، هذا عرض السعر رقم ${q.number} من «تمور السلطان»:\n${link}`
    : `Hello, here is quotation ${q.number} from Alsultan Dates:\n${link}`;
  const wa = waLink((q.buyer_contact || "").replace(/[^\d+]/g, ""), waText);
  const mail = (q.buyer_contact || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/);

  const body = `
  <p class="small"><a href="/admin/quotes">→ كل العروض</a>${q.request_id ? ` · <a href="/admin/r/${q.request_id}">الطلب المرتبط</a>` : ""}</p>
  ${flags.created ? `<div class="notice">تم إنشاء العرض. راجعه ثم أرسله للزبون.</div>` : ""}
  ${flags.saved ? `<div class="notice">تم حفظ التعديلات.</div>` : ""}
  ${flags.sent ? `<div class="notice">تم تعليم العرض كمُرسل${flags.mail === "ok" ? " وأُرسل بالبريد إلى الزبون." : flags.mail === "fail" ? "، لكن إرسال البريد فشل — استخدم رابط واتساب أو انسخ الرابط." : "."}</div>` : ""}

  <h1>عرض سعر ${esc(q.number)} ${tag(q.status, QSTATUS_AR)}</h1>
  <p class="sub">${esc(q.buyer_company)} — ${esc(q.buyer_country || "")} · أُنشئ ${esc(fmtDate(q.created_at))} · صالح حتى ${esc(fmtDate(q.valid_until))}</p>

  <div class="grid g2">
    <div class="card">
      <h2 style="margin-top:0">البنود</h2>
      <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${items.map(it => `<tr>
        <td>${esc(it.desc)}<br/><span class="small muted">${esc([it.grade, it.pack].filter(Boolean).join(" · "))}</span></td>
        <td>${esc(it.qty)} ${esc(it.unit)}</td>
        <td>${esc(money(it.price, q.currency))}</td>
        <td>${esc(money(it.qty * it.price, q.currency))}</td></tr>`).join("")}</tbody></table>
      <div class="totbox" style="margin-top:16px">
        <div class="line"><span>الشحن / التأمين</span><b>${esc(money(q.freight, q.currency))}</b></div>
        <div class="line"><span>الخصم</span><b>- ${esc(money(q.discount, q.currency))}</b></div>
        <div class="line grand"><span>الإجمالي</span><b>${esc(money(q.total, q.currency))}</b></div>
      </div>
    </div>

    <div>
      <div class="card">
        <h2 style="margin-top:0">إرسال العرض للزبون</h2>
        <p class="small muted">رابط خاص لا يمكن تخمينه — الزبون يفتحه ويطبعه PDF ويقبل أو يعتذر منه مباشرة.</p>
        <code class="copy" id="lnk">${esc(link)}</code>
        <div class="row" style="margin-top:14px">
          <button class="btn ghost sm" type="button" onclick="navigator.clipboard.writeText(document.getElementById('lnk').textContent);this.textContent='تم النسخ ✓'">نسخ الرابط</button>
          <a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(link)}">معاينة</a>
          ${wa ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(wa)}">إرسال واتساب</a>` : ""}
        </div>
        ${mail ? `<form method="post" action="/admin/q/${q.id}/send" style="margin-top:16px">
            <button class="btn" type="submit">إرسال بالبريد إلى ${esc(mail[0])}</button>
          </form>`
          : `<p class="small muted" style="margin-top:14px">لا يوجد بريد إلكتروني لهذا الزبون — استخدم واتساب أو انسخ الرابط.</p>
             <form method="post" action="/admin/q/${q.id}/send" style="margin-top:8px">
               <input type="hidden" name="mark_only" value="1" />
               <button class="btn ghost sm" type="submit">تعليم كمُرسل</button>
             </form>`}
      </div>

      <div class="card">
        <h2 style="margin-top:0">الحالة</h2>
        <dl class="kv">
          <dt>أُرسل في</dt><dd>${esc(fmtDateTime(q.sent_at))}</dd>
          <dt>أول مشاهدة</dt><dd>${esc(fmtDateTime(q.first_view_at))}</dd>
          <dt>عدد المشاهدات</dt><dd>${q.view_count || 0}</dd>
          <dt>ردّ الزبون</dt><dd>${q.responded_at ? `${esc(QSTATUS_AR[q.status] || q.status)} — ${esc(fmtDateTime(q.responded_at))}` : "بانتظار الرد"}</dd>
          ${q.buyer_message ? `<dt>رسالة الزبون</dt><dd>${esc(q.buyer_message)}</dd>` : ""}
        </dl>
        <div class="row" style="margin-top:14px">
          <a class="btn ghost sm" href="/admin/q/${q.id}/edit">تعديل العرض</a>
        </div>
      </div>
    </div>
  </div>`;
  return html(layout({ title: `عرض ${q.number}`, body, env, active: "quotes" }));
}

export async function sendQuote(env, db, id, form) {
  const q = await db.prepare("SELECT * FROM quotes WHERE id = ?").bind(id).first();
  if (!q) return redirect("/admin/quotes");
  const link = `${env.PUBLIC_BASE_URL || ""}/q/${q.token}`;
  let mail = "";
  const to = (q.buyer_contact || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (to && !form.get("mark_only")) {
    const res = await sendEmail(env, {
      to: to[0],
      subject: q.lang === "en" ? `Quotation ${q.number} — Alsultan Dates` : `عرض سعر ${q.number} — تمور السلطان`,
      html: quoteEmailHTML(env, q, link, q.lang),
      replyTo: env.SALES_EMAIL
    });
    mail = res.ok ? "ok" : res.skipped ? "" : "fail";
  }
  await db.prepare("UPDATE quotes SET status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END, sent_at = COALESCE(sent_at, ?), updated_at = ? WHERE id = ?")
    .bind(nowISO(), nowISO(), id).run();
  if (q.request_id) {
    await db.prepare("UPDATE requests SET status = CASE WHEN status IN ('new','contacted') THEN 'quoted' ELSE status END WHERE id = ?")
      .bind(q.request_id).run();
  }
  return redirect(`/admin/q/${id}?sent=1${mail ? `&mail=${mail}` : ""}`);
}

/* ============================ تصدير ============================ */

export async function exportCSV(env, db) {
  const { results = [] } = await db.prepare("SELECT * FROM requests ORDER BY created_at DESC").all();
  const cols = ["ref", "created_at", "company", "country", "qty", "grade", "pack", "contact", "notes", "status", "internal_notes"];
  const head = ["المرجع", "التاريخ", "الشركة", "الدولة", "الكمية", "الدرجة", "التعبئة", "التواصل", "ملاحظات", "الحالة", "ملاحظات داخلية"];
  const q = s => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
  const csv = "﻿" + [head.map(q).join(","), ...results.map(r => cols.map(c => q(r[c])).join(","))].join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="alsultan-requests-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
