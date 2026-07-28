/**
 * Crea o actualiza el usuario admin en Neon.
 * Uso: node scripts/seed-admin.mjs
 * Lee DATABASE_URL de .env.local y opcionalmente:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  try {
    const env = readFileSync(resolve(root, ".env.local"), "utf8").replace(/^\uFEFF/, "");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL || "angeluis012@hotmail.com").toLowerCase();
const name = process.env.ADMIN_NAME || "Angel";
const password =
  process.env.ADMIN_PASSWORD ||
  `Atlas-${randomBytes(4).toString("hex")}!`;

const sql = neon(url);
const passwordHash = hashPassword(password);

const existing = await sql`SELECT id FROM admin_users WHERE email = ${email} LIMIT 1`;

if (existing.length) {
  await sql`
    UPDATE admin_users
    SET password_hash = ${passwordHash}, name = ${name}, role = 'owner'
    WHERE email = ${email}
  `;
  console.log(`Admin actualizado: ${email}`);
} else {
  await sql`
    INSERT INTO admin_users (email, password_hash, name, role)
    VALUES (${email}, ${passwordHash}, ${name}, 'owner')
  `;
  console.log(`Admin creado: ${email}`);
}

console.log("");
console.log("=== Credenciales del panel (guárdalas) ===");
console.log(`URL:      /admin/`);
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
console.log("==========================================");
