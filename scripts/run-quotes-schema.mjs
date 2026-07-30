import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(resolve(root, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error("No DATABASE_URL");

const sql = neon(url);
const text = readFileSync(resolve(root, "sql/quotes.sql"), "utf8");

function splitStatements(src) {
  const cleaned = src.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
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

for (const stmt of splitStatements(text)) {
  await sql.query(stmt);
  console.log("✓", stmt.replace(/\s+/g, " ").slice(0, 70));
}
const t = await sql`SELECT to_regclass('public.quotes') AS reg`;
console.log("quotes table:", t[0]);
