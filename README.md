# Atlas Facility Services

Sitio web corporativo + API de **Atlas Facility Services** (Los Cabos, BCS).

**Stack:** HTML/CSS/JS · Vercel Serverless · [Neon](https://neon.tech) (PostgreSQL)

## Contacto público

| | |
|---|---|
| Email | angeluis012@hotmail.com |
| Teléfono | +52 624 100 0381 |
| Zona | Baja California Sur · Cabo San Lucas · San José del Cabo |

## Qué hay en el repo

| Ruta | Uso |
|------|-----|
| `index.html` | Landing pública |
| `api/leads.js` | Guarda cotizaciones del formulario en Neon |
| `sql/schema.sql` | Tablas: leads, clients, projects, finance, admin |
| `lib/db.js` | Cliente Neon serverless |
| Panel admin | Próximo paso (solo interno, no visible al cliente) |

## 1. Crear base de datos en Neon

1. Cuenta en [console.neon.tech](https://console.neon.tech)
2. New Project → nombre `atlas-facility` (o similar)
3. Copia la **connection string** (modo **pooled** / serverless, `sslmode=require`)
4. SQL Editor → pega y ejecuta todo el contenido de `sql/schema.sql`

## 2. Variables de entorno

Copia `.env.example` → `.env.local` (local) y en Vercel:

```
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
```

**Vercel:** Project → Settings → Environment Variables → `DATABASE_URL` (Production + Preview).

## 3. Deploy en Vercel

1. Importa el repo [Angeluis001/Atlas-Facility-Services](https://github.com/Angeluis001/Atlas-Facility-Services)
2. Framework: **Other**
3. Install Command: `npm install`
4. Build Command: *(vacío)*
5. Output Directory: *(vacío / .)*
6. Añade `DATABASE_URL` y redespliega

O con CLI:

```bash
npm i -g vercel
vercel link
vercel env add DATABASE_URL
vercel --prod
```

## 4. Desarrollo local

```bash
npm install
npx vercel dev
```

Abre la URL que indique la CLI (el formulario llama a `/api/leads`).

## Formulario → base de datos

Cada envío válido del formulario inserta un registro en `leads` con `status = 'nuevo'`.  
Esos leads alimentarán el **panel de administración** (seguimiento de clientes, proyectos, finanzas).

## Panel admin

- Login privado
- Leads (web + manual), clientes, proyectos, finanzas
- **Cotizaciones con IA** (`/admin` → Cotizaciones): describe el trabajo → genera partidas con OpenAI → edita y guarda → imprime

### Variables de entorno (Vercel)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Neon |
| `ADMIN_SESSION_SECRET` | Cookies de sesión admin |
| `OPENAI_API_KEY` | Generación de cotizaciones |
| `OPENAI_MODEL` | Opcional, default `gpt-4o-mini` |

## Roadmap del panel

- [x] Login, leads, clientes, proyectos, finanzas
- [x] Cotizaciones con IA
- [ ] PDF profesional / envío por email
- [ ] Convertir cotización aceptada → proyecto + finanzas

## Seguridad

- Nunca subas `.env` / `.env.local` al repo
- El panel admin no tendrá enlaces en la web pública
- Las rutas admin irán protegidas (sesión / auth)
