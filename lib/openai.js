/**
 * Cliente mínimo de OpenAI Chat Completions (sin SDK).
 * OPENAI_API_KEY en variables de entorno (nunca en el frontend).
 */

export async function chatJson({ system, user, model = "gpt-4o-mini", temperature = 0.4 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Falta OPENAI_API_KEY en variables de entorno");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI error ${res.status}`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("La IA no devolvió JSON válido");
  }

  return {
    parsed,
    model: data.model || model,
    raw: data,
  };
}

export const ATLAS_QUOTE_SYSTEM = `Eres el cotizador senior de ATLAS Facility Services, empresa de servicios integrales para inmuebles en Baja California Sur (Cabo San Lucas y San José del Cabo), México.

Servicios del negocio:
- HVAC (climatización, A/C, ventilación, mantenimiento de equipos)
- Eléctrico (instalaciones, tableros, iluminación, fallas, fuerza)
- Plomería (hidráulica, sanitaria, fugas, instalaciones)
- Pintura (interiores/exteriores comercial e industrial, preparación de superficies)
- Mantenimiento general (preventivo y correctivo multi-técnico)
- Seguridad electrónica (CCTV, control de acceso, alarmas)

Reglas:
1. Responde SOLO con un objeto JSON válido (sin markdown).
2. Precios en pesos mexicanos (MXN), realistas para Los Cabos / BCS (mano de obra y materiales suelen ser algo más altos que el promedio nacional).
3. Desglosa partidas claras: mano de obra, materiales, equipos si aplica, y conceptos de servicio.
4. Cada partida: description, quantity (número), unit (p.ej. "servicio", "pieza", "m2", "hora", "lote"), unit_price (número en MXN, no centavos).
5. Incluye title breve profesional de la cotización.
6. Incluye conditions: texto de condiciones comerciales (vigencia 15 días, no incluye trabajos no especificados, garantía de mano de obra 30-90 días según tipo, forma de pago sugerida 50% anticipo / 50% al concluir si aplica).
7. Incluye labor_notes y materials_notes breves.
8. Si falta información, asume un alcance razonable y márcalo en una partida o nota "sujeto a inspección en sitio".
9. No inventes certificaciones falsas. Tono profesional, claro y confiable (marca Atlas: "Soluciones integrales. Resultados confiables.").

Formato JSON exacto:
{
  "title": "string",
  "line_items": [
    { "description": "string", "quantity": 1, "unit": "servicio", "unit_price": 1500 }
  ],
  "labor_notes": "string",
  "materials_notes": "string",
  "conditions": "string",
  "assumptions": "string"
}`;
