import { neon } from "@neondatabase/serverless";

/**
 * Cliente SQL de Neon (serverless, ideal para Vercel).
 * Requiere DATABASE_URL en variables de entorno.
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL. Configúrala en Vercel o en .env.local");
  }
  return neon(url);
}
