import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

const STATUSES = new Set(["pendiente", "en_progreso", "completado", "cancelado", "pausado"]);

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  const sql = getSql();

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT p.*,
          c.name AS client_name,
          c.company AS client_company
        FROM projects p
        JOIN clients c ON c.id = p.client_id
        ORDER BY p.updated_at DESC
        LIMIT 300
      `;
      return json(res, 200, { ok: true, projects: rows });
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const clientId = sanitize(body.client_id || body.clientId, 40);
      const title = sanitize(body.title, 200);
      if (!clientId || !title) {
        return json(res, 400, { ok: false, error: "client_id y title requeridos" });
      }

      const budget = Number(body.budget_cents ?? body.budgetCents ?? 0) || 0;
      const status = STATUSES.has(body.status) ? body.status : "pendiente";

      const rows = await sql`
        INSERT INTO projects (
          client_id, title, service_type, description, status,
          budget_cents, currency, start_date, end_date, notes
        ) VALUES (
          ${clientId},
          ${title},
          ${sanitize(body.service_type || body.serviceType, 80) || null},
          ${sanitize(body.description, 4000) || null},
          ${status},
          ${budget},
          ${sanitize(body.currency, 8) || "MXN"},
          ${body.start_date || body.startDate || null},
          ${body.end_date || body.endDate || null},
          ${sanitize(body.notes, 4000) || null}
        )
        RETURNING *
      `;
      return json(res, 201, { ok: true, project: rows[0] });
    }

    if (req.method === "PATCH") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });

      const status = body.status && STATUSES.has(body.status) ? body.status : null;
      const budget =
        body.budget_cents != null || body.budgetCents != null
          ? Number(body.budget_cents ?? body.budgetCents) || 0
          : null;

      const rows = await sql`
        UPDATE projects SET
          title = COALESCE(${body.title != null ? sanitize(body.title, 200) : null}, title),
          service_type = COALESCE(${
            body.service_type != null || body.serviceType != null
              ? sanitize(body.service_type || body.serviceType, 80)
              : null
          }, service_type),
          description = COALESCE(${
            body.description != null ? sanitize(body.description, 4000) : null
          }, description),
          status = COALESCE(${status}, status),
          budget_cents = COALESCE(${budget}, budget_cents),
          start_date = COALESCE(${body.start_date || body.startDate || null}, start_date),
          end_date = COALESCE(${body.end_date || body.endDate || null}, end_date),
          notes = COALESCE(${body.notes != null ? sanitize(body.notes, 4000) : null}, notes)
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows.length) return json(res, 404, { ok: false, error: "Proyecto no encontrado" });
      return json(res, 200, { ok: true, project: rows[0] });
    }

    if (req.method === "DELETE") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });

      const existing = await sql`
        SELECT id, status FROM projects WHERE id = ${id} LIMIT 1
      `;
      if (!existing.length) {
        return json(res, 404, { ok: false, error: "Proyecto no encontrado" });
      }
      if (existing[0].status !== "cancelado") {
        return json(res, 400, {
          ok: false,
          error: "Solo se pueden borrar proyectos en estado cancelado",
        });
      }

      await sql`DELETE FROM projects WHERE id = ${id}`;
      return json(res, 200, { ok: true });
    }

    return methodNotAllowed(res, "GET, POST, PATCH, DELETE");
  } catch (err) {
    console.error("[admin/projects]", err);
    return json(res, 500, { ok: false, error: "Error en proyectos" });
  }
}
