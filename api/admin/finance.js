import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

const TYPES = new Set(["ingreso", "egreso"]);

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  const sql = getSql();

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT f.*,
          c.name AS client_name,
          p.title AS project_title
        FROM finance_entries f
        LEFT JOIN clients c ON c.id = f.client_id
        LEFT JOIN projects p ON p.id = f.project_id
        ORDER BY f.entry_date DESC, f.created_at DESC
        LIMIT 400
      `;

      const [totals] = await sql`
        SELECT
          coalesce(sum(amount_cents) FILTER (WHERE type = 'ingreso'), 0)::bigint AS ingresos,
          coalesce(sum(amount_cents) FILTER (WHERE type = 'egreso'), 0)::bigint AS egresos
        FROM finance_entries
      `;

      return json(res, 200, {
        ok: true,
        entries: rows,
        totals: {
          ingresos_cents: Number(totals.ingresos),
          egresos_cents: Number(totals.egresos),
          balance_cents: Number(totals.ingresos) - Number(totals.egresos),
        },
      });
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const type = sanitize(body.type, 20);
      if (!TYPES.has(type)) {
        return json(res, 400, { ok: false, error: "type debe ser ingreso o egreso" });
      }

      // amount: puede venir en pesos (amount) o centavos (amount_cents)
      let amountCents = Number(body.amount_cents ?? body.amountCents);
      if (!Number.isFinite(amountCents) || amountCents < 0) {
        const pesos = Number(body.amount);
        if (!Number.isFinite(pesos) || pesos < 0) {
          return json(res, 400, { ok: false, error: "Monto inválido" });
        }
        amountCents = Math.round(pesos * 100);
      }

      const rows = await sql`
        INSERT INTO finance_entries (
          project_id, client_id, type, category, amount_cents, currency, description, entry_date
        ) VALUES (
          ${sanitize(body.project_id || body.projectId, 40) || null},
          ${sanitize(body.client_id || body.clientId, 40) || null},
          ${type},
          ${sanitize(body.category, 80) || null},
          ${amountCents},
          ${sanitize(body.currency, 8) || "MXN"},
          ${sanitize(body.description, 1000) || null},
          ${body.entry_date || body.entryDate || new Date().toISOString().slice(0, 10)}
        )
        RETURNING *
      `;
      return json(res, 201, { ok: true, entry: rows[0] });
    }

    if (req.method === "DELETE") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });
      await sql`DELETE FROM finance_entries WHERE id = ${id}`;
      return json(res, 200, { ok: true });
    }

    return methodNotAllowed(res, "GET, POST, DELETE");
  } catch (err) {
    console.error("[admin/finance]", err);
    return json(res, 500, { ok: false, error: "Error en finanzas" });
  }
}
