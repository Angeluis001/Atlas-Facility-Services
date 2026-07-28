import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8").replace(/^\uFEFF/, "");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error("No DATABASE_URL");

const sql = neon(url);
const rows = await sql`
  INSERT INTO leads (name, company, email, phone, service, message, source, status)
  VALUES (
    'Prueba Atlas',
    'Test Co',
    'test@example.com',
    '+526241000381',
    'hvac',
    'Lead de prueba schema OK',
    'web',
    'nuevo'
  )
  RETURNING id, name, status, created_at
`;
console.log("Lead insert OK:", rows[0]);
const count = await sql`SELECT count(*)::int AS n FROM leads`;
console.log("Total leads:", count[0].n);
