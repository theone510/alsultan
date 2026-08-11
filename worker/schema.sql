-- Alsultan Dates · RFQ + Quotations schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS requests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT    NOT NULL UNIQUE,           -- RFQ-2026-0001
  company        TEXT    NOT NULL,
  country        TEXT    NOT NULL,
  qty            TEXT    NOT NULL,
  grade          TEXT    NOT NULL,
  pack           TEXT    NOT NULL,
  contact        TEXT    NOT NULL,                  -- كما كتبه الزائر
  contact_email  TEXT,                              -- مستخرج إن كان بريداً
  contact_phone  TEXT,                              -- مستخرج إن كان رقماً
  notes          TEXT,
  lang           TEXT    NOT NULL DEFAULT 'ar',
  status         TEXT    NOT NULL DEFAULT 'new',    -- new|contacted|quoted|won|lost
  internal_notes TEXT,
  ip             TEXT,
  country_code   TEXT,
  ua             TEXT,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests(status);

CREATE TABLE IF NOT EXISTS quotes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  number        TEXT    NOT NULL UNIQUE,            -- Q-2026-0001
  token         TEXT    NOT NULL UNIQUE,            -- رابط علني غير قابل للتخمين
  request_id    INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  buyer_company TEXT    NOT NULL,
  buyer_country TEXT,
  buyer_contact TEXT,
  lang          TEXT    NOT NULL DEFAULT 'ar',
  currency      TEXT    NOT NULL DEFAULT 'USD',
  incoterm      TEXT,                               -- FOB Umm Qasr / CIF Jebel Ali ...
  port          TEXT,
  payment_terms TEXT,
  lead_time     TEXT,
  validity_days INTEGER NOT NULL DEFAULT 14,
  valid_until   TEXT,
  items         TEXT    NOT NULL DEFAULT '[]',      -- JSON: [{desc,grade,pack,qty,unit,price}]
  freight       REAL    NOT NULL DEFAULT 0,
  discount      REAL    NOT NULL DEFAULT 0,
  total         REAL    NOT NULL DEFAULT 0,
  notes         TEXT,
  bank          TEXT,
  status        TEXT    NOT NULL DEFAULT 'draft',   -- draft|sent|accepted|rejected|expired
  sent_at       TEXT,
  first_view_at TEXT,
  view_count    INTEGER NOT NULL DEFAULT 0,
  responded_at  TEXT,
  buyer_message TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(request_id);

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,        -- 'rfq:2026' | 'quote:2026'
  value INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rate_limit (
  k            TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT
);
