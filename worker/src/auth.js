// جلسة لوحة التحكم: كوكي موقّع بـ HMAC-SHA256 (بدون مكتبات)

import { b64url } from "./util.js";

const COOKIE = "als_admin";
const MAX_AGE = 60 * 60 * 12; // 12 ساعة

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64url(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secretOf(env) {
  return env.SESSION_SECRET || env.ADMIN_PASSWORD || "";
}

export async function makeSession(env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `admin.${exp}`;
  const sig = await hmac(secretOf(env), payload);
  return `${payload}.${sig}`;
}

export async function verifySession(env, token) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, exp, sig] = parts;
  if (who !== "admin") return false;
  if (Number(exp) * 1000 < Date.now()) return false;
  const expected = await hmac(secretOf(env), `${who}.${exp}`);
  return timingSafeEqual(sig, expected);
}

export function readCookie(req, name = COOKIE) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function sessionCookie(value, { clear = false, secure = true } = {}) {
  const attrs = [
    `${COOKIE}=${clear ? "" : encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    clear ? "Max-Age=0" : `Max-Age=${MAX_AGE}`
  ].filter(Boolean);
  return attrs.join("; ");
}

export async function isAuthed(env, req) {
  return verifySession(env, readCookie(req));
}

export function checkPassword(env, given) {
  const expected = String(env.ADMIN_PASSWORD || "");
  if (!expected) return false;
  return timingSafeEqual(String(given || ""), expected);
}
