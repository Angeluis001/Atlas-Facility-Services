import { getSql } from "../lib/db.js";

const ALLOWED_SERVICES = new Set([
  "hvac",
  "electrico",
  "plomeria",
  "pintura",
  "mantenimiento",
  "seguridad",
  "varios",
  "",
]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sanitize(value, max = 500) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Método no permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const name = sanitize(body.name, 120);
    const company = sanitize(body.company, 160);
    const email = sanitize(body.email, 200).toLowerCase();
    const phone = sanitize(body.phone, 40);
    const service = sanitize(body.service, 40).toLowerCase();
    const message = sanitize(body.message, 4000);

    if (!name || !email || !message) {
      return json(res, 400, {
        ok: false,
        error: "Nombre, email y mensaje son obligatorios",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(res, 400, { ok: false, error: "Email no válido" });
    }

    if (!ALLOWED_SERVICES.has(service)) {
      return json(res, 400, { ok: false, error: "Servicio no válido" });
    }

    const sql = getSql();
    const rows = await sql`
      INSERT INTO leads (name, company, email, phone, service, message, source, status)
      VALUES (
        ${name},
        ${company || null},
        ${email},
        ${phone || null},
        ${service || null},
        ${message},
        'web',
        'nuevo'
      )
      RETURNING id, created_at
    `;

    return json(res, 201, {
      ok: true,
      lead: { id: rows[0].id, created_at: rows[0].created_at },
    });
  } catch (err) {
    console.error("[api/leads]", err);
    const missingDb = String(err?.message || "").includes("DATABASE_URL");
    return json(res, 500, {
      ok: false,
      error: missingDb
        ? "Base de datos no configurada"
        : "No se pudo guardar la solicitud. Intenta de nuevo.",
    });
  }
}
