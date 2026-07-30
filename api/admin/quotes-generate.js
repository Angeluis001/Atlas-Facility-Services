import { requireAdmin } from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";
import { chatJson, ATLAS_QUOTE_SYSTEM } from "../../lib/openai.js";

function toCents(pesos) {
  const n = Number(pesos);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const quantity = Number(it.quantity) || 1;
      const unitPrice = Number(it.unit_price ?? it.unitPrice) || 0;
      const unitPriceCents = toCents(unitPrice);
      const totalCents = Math.round(quantity * unitPriceCents);
      return {
        description: sanitize(it.description, 500) || "Concepto",
        quantity,
        unit: sanitize(it.unit, 40) || "servicio",
        unit_price_cents: unitPriceCents,
        total_cents: totalCents,
      };
    })
    .filter((it) => it.description);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const body = readBody(req);
    const serviceType = sanitize(body.service_type || body.serviceType, 80);
    const jobDescription = sanitize(body.job_description || body.jobDescription, 5000);
    const clientName = sanitize(body.client_name || body.clientName, 160);
    const clientCompany = sanitize(body.client_company || body.clientCompany, 160);
    const location = sanitize(body.location, 200) || "Los Cabos, BCS";
    const extra = sanitize(body.extra_context || body.extraContext, 2000);

    if (!jobDescription || jobDescription.length < 10) {
      return json(res, 400, {
        ok: false,
        error: "Describe el trabajo con más detalle (mín. 10 caracteres)",
      });
    }

    const userPrompt = [
      `Genera una cotización profesional para Atlas Facility Services.`,
      clientName ? `Cliente: ${clientName}` : null,
      clientCompany ? `Empresa: ${clientCompany}` : null,
      `Ubicación del trabajo: ${location}`,
      serviceType ? `Servicio principal: ${serviceType}` : "Servicio: a inferir del alcance",
      `Descripción del trabajo:\n${jobDescription}`,
      extra ? `Contexto adicional del vendedor:\n${extra}` : null,
      `Devuelve el JSON con title, line_items, labor_notes, materials_notes, conditions, assumptions.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { parsed, model } = await chatJson({
      system: ATLAS_QUOTE_SYSTEM,
      user: userPrompt,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.35,
    });

    const lineItems = normalizeItems(parsed.line_items || parsed.lineItems || []);
    const subtotal = lineItems.reduce((s, it) => s + (it.total_cents || 0), 0);

    return json(res, 200, {
      ok: true,
      draft: {
        title: sanitize(parsed.title, 200) || "Cotización de servicios",
        service_type: serviceType || null,
        line_items: lineItems,
        labor_notes: sanitize(parsed.labor_notes || parsed.laborNotes, 2000),
        materials_notes: sanitize(parsed.materials_notes || parsed.materialsNotes, 2000),
        conditions: sanitize(parsed.conditions, 4000),
        assumptions: sanitize(parsed.assumptions, 2000),
        subtotal_cents: subtotal,
        ai_model: model,
      },
    });
  } catch (err) {
    console.error("[quotes-generate]", err);
    return json(res, 500, {
      ok: false,
      error: err.message || "No se pudo generar la cotización con IA",
    });
  }
}
