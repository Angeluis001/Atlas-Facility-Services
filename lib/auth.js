import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSql } from "./db.js";
import { json } from "./http.js";

const COOKIE = "atlas_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

function sessionSecret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Falta ADMIN_SESSION_SECRET (mín. 16 caracteres)");
  }
  return s;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signSession(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(body));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SEC}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const parts = [
    `${COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function getSession(req) {
  const cookies = parseCookies(req);
  return verifySession(cookies[COOKIE]);
}

/** Middleware: exige sesión admin válida. Devuelve el usuario o envía 401. */
export async function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session?.sub) {
    json(res, 401, { ok: false, error: "No autorizado" });
    return null;
  }

  const sql = getSql();
  const rows = await sql`
    SELECT id, email, name, role
    FROM admin_users
    WHERE id = ${session.sub}
    LIMIT 1
  `;
  if (!rows.length) {
    json(res, 401, { ok: false, error: "No autorizado" });
    return null;
  }
  return rows[0];
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return signSession({
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + MAX_AGE_SEC,
  });
}

export { COOKIE, MAX_AGE_SEC };
