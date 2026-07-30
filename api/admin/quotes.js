import { getSql } from "../../lib/db.js";
import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

const STATUSES = new Set(["borrador", "enviada", "aceptada", "rechazada", "vencida"]);

function calcTotals(lineItems, taxRate = 0.16) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const normalized = items.map((it) => {
    const quantity = Number(it.quantity) || 0;
    const unitPriceCents = Number(it.unit_price_cents ?? it.unitPriceCents) || 0;
    const totalCents =
      it.total_cents != null
        ? Number(it.total_cents)
        : Math.round(quantity * unitPriceCents);
    return {
      description: sanitize(it.description, 500) || "Concepto",
      quantity,
      unit: sanitize(it.unit, 40) || "servicio",
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
    };
  });
  const subtotal = normalized.reduce((s, it) => s + it.total_cents, 0);
  const rate = Number(taxRate);
  const safeRate = Number.isFinite(rate) && rate >= 0 ? rate : 0.16;
  const tax = Math.round(subtotal * safeRate);
  return {
    line_items: normalized,
    subtotal_cents: subtotal,
    tax_rate: safeRate,
    tax_cents: tax,
    total_cents: subtotal + tax,
  };
}

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  const sql = getSql();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = url.searchParams.get("id");
      if (id) {
        const rows = await sql`SELECT * FROM quotes WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return json(res, 404, { ok: false, error: "Cotización no encontrada" });
        return json(res, 200, { ok: true, quote: rows[0] });
      }
      const rows = await sql`
        SELECT id, client_name, client_company, service_type, title, status,
               total_cents, currency, valid_until, created_at, updated_at
        FROM quotes
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return json(res, 200, { ok: true, quotes: rows });
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const clientName = sanitize(body.client_name || body.clientName, 160);
      const title = sanitize(body.title, 200);
      const jobDescription = sanitize(body.job_description || body.jobDescription, 5000);

      if (!clientName || !title || !jobDescription) {
        return json(res, 400, {
          ok: false,
          error: "client_name, title y job_description son obligatorios",
        });
      }

      const taxRate = body.tax_rate != null ? Number(body.tax_rate) : 0.16;
      const totals = calcTotals(body.line_items || body.lineItems || [], taxRate);
      const validDays = Number(body.valid_days ?? body.validDays) || 15;
      const validUntil =
        body.valid_until ||
        body.validUntil ||
        new Date(Date.now() + validDays * 86400000).toISOString().slice(0, 10);
      const status = STATUSES.has(body.status) ? body.status : "borrador";

      const rows = await sql`
        INSERT INTO quotes (
          client_id, lead_id, client_name, client_company, client_email, client_phone,
          client_address, service_type, title, job_description, line_items,
          labor_notes, materials_notes, conditions, subtotal_cents, tax_rate,
          tax_cents, total_cents, currency, valid_days, valid_until, status,
          ai_model, notes
        ) VALUES (
          ${sanitize(body.client_id || body.clientId, 40) || null},
          ${sanitize(body.lead_id || body.leadId, 40) || null},
          ${clientName},
          ${sanitize(body.client_company || body.clientCompany, 160) || null},
          ${sanitize(body.client_email || body.clientEmail, 200).toLowerCase() || null},
          ${sanitize(body.client_phone || body.clientPhone, 40) || null},
          ${sanitize(body.client_address || body.clientAddress, 300) || null},
          ${sanitize(body.service_type || body.serviceType, 80) || null},
          ${title},
          ${jobDescription},
          ${JSON.stringify(totals.line_items)},
          ${sanitize(body.labor_notes || body.laborNotes, 2000) || null},
          ${sanitize(body.materials_notes || body.materialsNotes, 2000) || null},
          ${sanitize(body.conditions, 4000) || null},
          ${totals.subtotal_cents},
          ${totals.tax_rate},
          ${totals.tax_cents},
          ${totals.total_cents},
          ${sanitize(body.currency, 8) || "MXN"},
          ${validDays},
          ${validUntil},
          ${status},
          ${sanitize(body.ai_model || body.aiModel, 80) || null},
          ${sanitize(body.notes, 2000) || null}
        )
        RETURNING *
      `;
      return json(res, 201, { ok: true, quote: rows[0] });
    }

    if (req.method === "PATCH") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });

      const existing = await sql`SELECT * FROM quotes WHERE id = ${id} LIMIT 1`;
      if (!existing.length) return json(res, 404, { ok: false, error: "Cotización no encontrada" });

      const current = existing[0];
      const lineItems = body.line_items || body.lineItems || current.line_items;
      const taxRate =
        body.tax_rate != null ? Number(body.tax_rate) : Number(current.tax_rate) || 0.16;
      const totals = calcTotals(lineItems, taxRate);
      const status =
        body.status && STATUSES.has(body.status) ? body.status : current.status;

      const rows = await sql`
        UPDATE quotes SET
          client_name = COALESCE(${body.client_name != null || body.clientName != null ? sanitize(body.client_name || body.clientName, 160) : null}, client_name),
          client_company = COALESCE(${body.client_company != null || body.clientCompany != null ? sanitize(body.client_company || body.clientCompany, 160) : null}, client_company),
          client_email = COALESCE(${body.client_email != null || body.clientEmail != null ? sanitize(body.client_email || body.clientEmail, 200).toLowerCase() : null}, client_email),
          client_phone = COALESCE(${body.client_phone != null || body.clientPhone != null ? sanitize(body.client_phone || body.clientPhone, 40) : null}, client_phone),
          client_address = COALESCE(${body.client_address != null || body.clientAddress != null ? sanitize(body.client_address || body.clientAddress, 300) : null}, client_address),
          service_type = COALESCE(${body.service_type != null || body.serviceType != null ? sanitize(body.service_type || body.serviceType, 80) : null}, service_type),
          title = COALESCE(${body.title != null ? sanitize(body.title, 200) : null}, title),
          job_description = COALESCE(${body.job_description != null || body.jobDescription != null ? sanitize(body.job_description || body.jobDescription, 5000) : null}, job_description),
          line_items = ${JSON.stringify(totals.line_items)}::jsonb,
          labor_notes = COALESCE(${body.labor_notes != null || body.laborNotes != null ? sanitize(body.labor_notes || body.laborNotes, 2000) : null}, labor_notes),
          materials_notes = COALESCE(${body.materials_notes != null || body.materialsNotes != null ? sanitize(body.materials_notes || body.materialsNotes, 2000) : null}, materials_notes),
          conditions = COALESCE(${body.conditions != null ? sanitize(body.conditions, 4000) : null}, conditions),
          subtotal_cents = ${totals.subtotal_cents},
          tax_rate = ${totals.tax_rate},
          tax_cents = ${totals.tax_cents},
          total_cents = ${totals.total_cents},
          status = ${status},
          notes = COALESCE(${body.notes != null ? sanitize(body.notes, 2000) : null}, notes),
          valid_until = COALESCE(${body.valid_until || body.validUntil || null}, valid_until)
        WHERE id = ${id}
        RETURNING *
      `;
      return json(res, 200, { ok: true, quote: rows[0] });
    }

    if (req.method === "DELETE") {
      const body = readBody(req);
      const id = sanitize(body.id, 40);
      if (!id) return json(res, 400, { ok: false, error: "id requerido" });
      await sql`DELETE FROM quotes WHERE id = ${id}`;
      return json(res, 200, { ok: true });
    }

    return methodNotAllowed(res, "GET, POST, PATCH, DELETE");
  } catch (err) {
    console.error("[admin/quotes]", err);
    return json(res, 500, { ok: false, error: "Error en cotizaciones" });
  }
}
