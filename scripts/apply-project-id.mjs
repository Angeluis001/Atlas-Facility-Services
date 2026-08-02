import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(resolve(root, ".env.local"), "utf8").replace(/^\uFEFF/, "");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error("No DATABASE_URL");
const sql = neon(url);

await sql.query(`
  ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL
`);
await sql.query(`CREATE INDEX IF NOT EXISTS quotes_project_idx ON quotes (project_id)`);

const cols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'quotes' AND column_name IN ('client_id', 'project_id')
  ORDER BY column_name
`;
console.log("OK columns:", cols);
