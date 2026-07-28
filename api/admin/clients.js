import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

const STATUSES = new Set(["activo", "inactivo", "prospecto"]);

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  const sql = getSql();

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT c.*,
          (SELECT count(*)::int FROM projects p WHERE p.client_id = c.id) AS project_count
        FROM clients c
        ORDER BY c.updated_at DESC
        LIMIT 300
      `;
      return json(res, 200, { ok: true, clients: rows });
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const name = sanitize(body.name, 160);
      if (!name) return json(res, 400, { ok: false, error: "Nombre requerido" });

      const rows = await sql`
        INSERT INTO clients (
          name, company, email, phone, address, city, region, notes, status
        ) VALUES (
          ${name},
          ${sanitize(body.company, 160) || null},
          ${sanitize(body.email, 200).toLowerCase() || null},
          ${sanitize(body.phone, 40) || null},
          ${sanitize(body.address, 300) || null},
          ${sanitize(body.city, 100) || "Cabo San Lucas"},
          ${sanitize(body.region, 100) || "Baja California Sur"},
          ${sanitize(body.notes, 4000) || null},
          ${STATUSES.has(body.status) ? body.status : "activo"}
        )
        RETURNING *
      `;
      return json(res, 201, { ok: true, client: rows[0] });
    }

    if (req.method === "PATCH") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });

      const status = body.status && STATUSES.has(body.status) ? body.status : null;

      const rows = await sql`
        UPDATE clients SET
          name = COALESCE(${body.name != null ? sanitize(body.name, 160) : null}, name),
          company = COALESCE(${body.company != null ? sanitize(body.company, 160) : null}, company),
          email = COALESCE(${body.email != null ? sanitize(body.email, 200).toLowerCase() : null}, email),
          phone = COALESCE(${body.phone != null ? sanitize(body.phone, 40) : null}, phone),
          address = COALESCE(${body.address != null ? sanitize(body.address, 300) : null}, address),
          city = COALESCE(${body.city != null ? sanitize(body.city, 100) : null}, city),
          region = COALESCE(${body.region != null ? sanitize(body.region, 100) : null}, region),
          notes = COALESCE(${body.notes != null ? sanitize(body.notes, 4000) : null}, notes),
          status = COALESCE(${status}, status)
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows.length) return json(res, 404, { ok: false, error: "Cliente no encontrado" });
      return json(res, 200, { ok: true, client: rows[0] });
    }

    return methodNotAllowed(res, "GET, POST, PATCH");
  } catch (err) {
    console.error("[admin/clients]", err);
    return json(res, 500, { ok: false, error: "Error en clientes" });
  }
}
