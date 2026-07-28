/**
 * Ejecuta sql/schema.sql contra Neon usando DATABASE_URL.
 * Uso: node --env-file=.env.local scripts/run-schema.mjs
 * (o con DATABASE_URL ya exportada)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Cargar .env.local si existe y no hay DATABASE_URL
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(resolve(root, ".env.local"), "utf8").replace(/^\uFEFF/, "");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.+)$/);
      if (m) process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (.env.local o variable de entorno)");
  process.exit(1);
}

const sqlText = readFileSync(resolve(root, "sql/schema.sql"), "utf8");
const sql = neon(url);

// Ejecutar el script completo (Neon soporta multi-statement en algunas APIs;
// con el driver tagged template mejor troceamos por ; fuera de $$)
function splitStatements(text) {
  const cleaned = text
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const parts = [];
  let buf = "";
  let inDollar = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === "$" && cleaned.slice(i, i + 2) === "$$") {
      inDollar = !inDollar;
      buf += "$$";
      i++;
      continue;
    }
    if (c === ";" && !inDollar) {
      const s = buf.trim();
      if (s) parts.push(s);
      buf = "";
      continue;
    }
    buf += c;
  }
  const tail = buf.trim();
  if (tail) parts.push(tail);
  return parts;
}

const statements = splitStatements(sqlText);
console.log(`Ejecutando ${statements.length} statements…`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await sql.query(stmt);
    const preview = stmt.replace(/\s+/g, " ").slice(0, 72);
    console.log(`  ✓ [${i + 1}/${statements.length}] ${preview}…`);
  } catch (err) {
    console.error(`  ✗ [${i + 1}] falló:`);
    console.error(stmt.slice(0, 200));
    console.error(err.message);
    process.exit(1);
  }
}

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;
console.log("\nTablas en public:");
for (const t of tables) console.log(" -", t.table_name);
console.log("\nSchema aplicado correctamente.");
