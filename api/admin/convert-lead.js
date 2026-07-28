import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

/** Convierte un lead en cliente y marca el lead como convertido */
export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const body = readBody(req);
    const leadId = sanitize(body.leadId || body.id, 40);
    if (!leadId) return json(res, 400, { ok: false, error: "leadId requerido" });

    const sql = getSql();
    const leads = await sql`SELECT * FROM leads WHERE id = ${leadId} LIMIT 1`;
    if (!leads.length) return json(res, 404, { ok: false, error: "Lead no encontrado" });

    const lead = leads[0];

    const existing = await sql`
      SELECT id FROM clients WHERE lead_id = ${leadId} LIMIT 1
    `;
    if (existing.length) {
      return json(res, 200, {
        ok: true,
        clientId: existing[0].id,
        message: "Ya existía un cliente para este lead",
      });
    }

    const clients = await sql`
      INSERT INTO clients (lead_id, name, company, email, phone, notes, status, city, region)
      VALUES (
        ${lead.id},
        ${lead.name},
        ${lead.company},
        ${lead.email},
        ${lead.phone},
        ${lead.message},
        'activo',
        'Cabo San Lucas',
        'Baja California Sur'
      )
      RETURNING *
    `;

    await sql`
      UPDATE leads SET status = 'convertido' WHERE id = ${leadId}
    `;

    return json(res, 201, { ok: true, client: clients[0] });
  } catch (err) {
    console.error("[admin/convert-lead]", err);
    return json(res, 500, { ok: false, error: "No se pudo convertir el lead" });
  }
}
