import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

const STATUSES = new Set(["nuevo", "contactado", "calificado", "descartado", "convertido"]);
const SERVICES = new Set([
  "hvac",
  "electrico",
  "plomeria",
  "pintura",
  "mantenimiento",
  "seguridad",
  "varios",
  "",
]);

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const sql = getSql();

  try {
    if (req.method === "POST") {
      const body = readBody(req);
      const name = sanitize(body.name, 120);
      const company = sanitize(body.company, 160);
      const email = sanitize(body.email, 200).toLowerCase();
      const phone = sanitize(body.phone, 40);
      const service = sanitize(body.service, 40).toLowerCase();
      const message = sanitize(body.message, 4000);
      const notes = sanitize(body.notes, 4000);
      const status = sanitize(body.status, 40) || "nuevo";
      const source = sanitize(body.source, 40) || "manual";

      if (!name || !email || !message) {
        return json(res, 400, {
          ok: false,
          error: "Nombre, email y mensaje son obligatorios",
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(res, 400, { ok: false, error: "Email no válido" });
      }
      if (!SERVICES.has(service)) {
        return json(res, 400, { ok: false, error: "Servicio no válido" });
      }
      if (!STATUSES.has(status)) {
        return json(res, 400, { ok: false, error: "Estado no válido" });
      }

      const rows = await sql`
        INSERT INTO leads (name, company, email, phone, service, message, notes, source, status)
        VALUES (
          ${name},
          ${company || null},
          ${email},
          ${phone || null},
          ${service || null},
          ${message},
          ${notes || null},
          ${source},
          ${status}
        )
        RETURNING *
      `;
      return json(res, 201, { ok: true, lead: rows[0] });
    }

    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const status = url.searchParams.get("status") || "";
      const q = (url.searchParams.get("q") || "").trim();

      let rows;
      if (status && STATUSES.has(status) && q) {
        const like = `%${q}%`;
        rows = await sql`
          SELECT * FROM leads
          WHERE status = ${status}
            AND (name ILIKE ${like} OR email ILIKE ${like} OR company ILIKE ${like} OR message ILIKE ${like})
          ORDER BY created_at DESC
          LIMIT 200
        `;
      } else if (status && STATUSES.has(status)) {
        rows = await sql`
          SELECT * FROM leads WHERE status = ${status}
          ORDER BY created_at DESC LIMIT 200
        `;
      } else if (q) {
        const like = `%${q}%`;
        rows = await sql`
          SELECT * FROM leads
          WHERE name ILIKE ${like} OR email ILIKE ${like} OR company ILIKE ${like} OR message ILIKE ${like}
          ORDER BY created_at DESC LIMIT 200
        `;
      } else {
        rows = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 200`;
      }

      return json(res, 200, { ok: true, leads: rows });
    }

    if (req.method === "PATCH") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });

      const status = body.status != null ? sanitize(body.status, 40) : null;
      const notes = body.notes != null ? sanitize(body.notes, 4000) : null;

      if (status && !STATUSES.has(status)) {
        return json(res, 400, { ok: false, error: "status inválido" });
      }

      const rows = await sql`
        UPDATE leads SET
          status = COALESCE(${status}, status),
          notes = COALESCE(${notes}, notes)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!rows.length) return json(res, 404, { ok: false, error: "Lead no encontrado" });
      return json(res, 200, { ok: true, lead: rows[0] });
    }

    if (req.method === "DELETE") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });

      const existing = await sql`
        SELECT id, status FROM leads WHERE id = ${id} LIMIT 1
      `;
      if (!existing.length) {
        return json(res, 404, { ok: false, error: "Lead no encontrado" });
      }
      if (existing[0].status !== "descartado") {
        return json(res, 400, {
          ok: false,
          error: "Solo se pueden borrar leads en estado descartado",
        });
      }

      await sql`DELETE FROM leads WHERE id = ${id}`;
      return json(res, 200, { ok: true });
    }

    return methodNotAllowed(res, "GET, POST, PATCH, DELETE");
  } catch (err) {
    console.error("[admin/leads]", err);
    return json(res, 500, { ok: false, error: "Error en leads" });
  }
}
