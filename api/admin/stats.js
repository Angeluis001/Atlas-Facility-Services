import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, methodNotAllowed } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const sql = getSql();

    const [leads] = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'nuevo')::int AS nuevos,
        count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS semana
      FROM leads
    `;

    const [clients] = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'activo')::int AS activos
      FROM clients
    `;

    const [projects] = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'en_progreso')::int AS en_progreso,
        count(*) FILTER (WHERE status = 'pendiente')::int AS pendientes
      FROM projects
    `;

    const [finance] = await sql`
      SELECT
        coalesce(sum(amount_cents) FILTER (WHERE type = 'ingreso'), 0)::bigint AS ingresos,
        coalesce(sum(amount_cents) FILTER (WHERE type = 'egreso'), 0)::bigint AS egresos
      FROM finance_entries
    `;

    const recentLeads = await sql`
      SELECT id, name, company, email, service, status, created_at
      FROM leads
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return json(res, 200, {
      ok: true,
      stats: {
        leads,
        clients,
        projects,
        finance: {
          ingresos_cents: Number(finance.ingresos),
          egresos_cents: Number(finance.egresos),
          balance_cents: Number(finance.ingresos) - Number(finance.egresos),
        },
        recentLeads,
      },
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return json(res, 500, { ok: false, error: "No se pudieron cargar estadísticas" });
  }
}
