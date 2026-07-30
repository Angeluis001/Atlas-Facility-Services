/**
 * Referencia de mercado Los Cabos / BCS (MXN) — actualizada 2026.
 * Fuentes: Habitissimo Los Cabos, HomePro/tablas México 2025-2026,
 * mercado turístico (factor +15–35% vs. centro del país por logística e inflación local).
 *
 * Rangos orientativos para cotización competitiva Atlas.
 * Siempre: desglosar MO vs materiales; visitas de diagnóstico; sujeto a inspección.
 */

export const MARKET_PRICING_CONTEXT = `
## TABULADOR COMPETITIVO — LOS CABOS / BCS (MXN, 2025-2026)

Factor zona turística: eleva 15–35% vs. promedios CDMX/centro. Materiales importados y fletes a península suben costo.
Posicionamiento Atlas: calidad profesional (no el más barato de Facebook, no hotel 5★ premium). Competir por valor: claridad, garantía, multi-servicio.

### HVAC / Climatización (Los Cabos — alta demanda)
- Instalación equipos A/C (Habitissimo Los Cabos): promedio ~$12,859 | rango $750 – $50,400 según alcance.
- Mano de obra instalación mini-split 1 ton (sin equipo, básica): $2,500 – $4,500
- Mano de obra instalación mini-split 1.5–2 ton: $3,500 – $6,500
- Línea frigorífica extra / metro adicional: $250 – $450 / m (incluye aislamiento típico)
- Soporte / base condensadora: $400 – $1,200
- Vacío + carga + arranque y pruebas: $800 – $1,800 (si se cotiza aparte)
- Mantenimiento preventivo residencial por equipo: $800 – $1,800
- Mantenimiento comercial multi-equipo (visita): $1,500 – $4,500+
- Diagnóstico / visita técnica: $500 – $1,200 (abonable a trabajo)

### Eléctrico (base México + premium BCS ~+20%)
Referencia nacional (HomePro 2026, mano de obra + insumos básicos):
- Contacto o apagador: $200 – $400 c/u  → BCS: $250 – $550
- Lámpara / ventilador techo (solo MO): $350 – $700  → BCS: $450 – $900
- Centro de carga / cambio: $1,500 – $3,500  → BCS: $1,800 – $4,500
- Cableado general casa/local: $6,000 – $15,000  → BCS: $7,500 – $20,000
- Mantenimiento instalación: $800 – $2,000  → BCS: $1,000 – $2,800
- Tierra física: $1,200 – $3,000  → BCS: $1,500 – $3,800
- Corto / falla (diagnóstico + reparación menor): $800 – $2,500
- Hora técnica electricista (difícil de medir): $450 – $750 / h en BCS
- Comercial oficina (visita/proyecto chico): $1,500 – $6,000
- Industrial puntual: $5,000 – $20,000+ (proyecto mayor aparte)

### Plomería
- Visita / diagnóstico: $400 – $1,000
- Destape básico: $600 – $1,500
- Reparación fuga menor (llave, empaque, sello): $500 – $1,800
- Cambio calentador / boiler (MO): $1,200 – $3,500 (equipo aparte)
- Instalación WC / lavabo (MO): $800 – $2,000 c/u
- Tubería nueva tramo corto: $1,500 – $5,000+
- Urgencia nocturna / domingo: +30–50%

### Pintura
- Interior m2 (mano de obra, 2 manos, superficie preparada): $80 – $160 / m2
- Exterior m2 (MO, climas marinos/salitre): $100 – $200 / m2
- Preparación / resane / lija (si no incluida): $40 – $90 / m2
- Recubrimiento especial / impermeabilizante: cotizar material + 20–40% MO
- Local comercial mediano (paquete): $8,000 – $35,000+

### Mantenimiento general
- Visita multi-técnica (diagnóstico): $600 – $1,500
- Ticket correctivo menor (1–2 h): $800 – $2,000
- Media jornada (4 h) técnico + ayudante: $2,000 – $4,000
- Día completo: $3,500 – $7,000
- Póliza mensual preventivo (local pequeño): $3,000 – $12,000 / mes según alcance

### Seguridad electrónica
- Cámara IP/analógica instalada (MO + montaje, sin equipo): $800 – $2,000 / cámara
- Kit 4 cámaras + DVR (paquete llave en mano, gamas media): $8,000 – $25,000
- Control de acceso 1 puerta (MO): $1,500 – $4,000 (equipo aparte)
- Cableado / metro canalizado: $80 – $180 / m
- Configuración NVR/app y capacitación: $500 – $1,500

### Reglas de cotización competitiva Atlas
1. No cotizar por debajo del 15% del mínimo de rango salvo “promoción de arranque” explícita.
2. No superar el máximo del rango sin justificar (urgencia, altura, zona hotelera, materiales premium, fin de semana).
3. Separar siempre: materiales / equipos vs mano de obra vs viáticos si aplica.
4. Incluir partida “Inspección / diagnóstico en sitio” cuando el alcance no esté 100% confirmado.
5. Vigencia 15 días; 50% anticipo / 50% al terminar en trabajos > $5,000 (ajustar a política real).
6. Garantía MO sugerida: 30 días correctivo menor, 60–90 días instalación nueva (sin abuso del equipo).
7. Clientes hoteleros / zona turística / extranjeros: precio en banda media-alta del rango + comunicación clara en español.
8. Si el cliente pide “mejorar presupuesto de la competencia”, bajar con valor (qué incluye Atlas) no solo descuento ciego.
`;
