-- Atlas Facility Services — Neon (PostgreSQL) schema
-- Ejecutar en la consola SQL de Neon (SQL Editor)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Leads del formulario web (y futuros canales)
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  company       TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  service       TEXT,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'nuevo'
                  CHECK (status IN ('nuevo', 'contactado', 'calificado', 'descartado', 'convertido')),
  source        TEXT NOT NULL DEFAULT 'web',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);

-- Clientes (manuales o convertidos desde leads)
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES leads (id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  company       TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT DEFAULT 'Cabo San Lucas',
  region        TEXT DEFAULT 'Baja California Sur',
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'activo'
                  CHECK (status IN ('activo', 'inactivo', 'prospecto')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_status_idx ON clients (status);
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients (name);

-- Proyectos / trabajos por cliente
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  service_type  TEXT,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (status IN ('pendiente', 'en_progreso', 'completado', 'cancelado', 'pausado')),
  budget_cents  BIGINT DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'MXN',
  start_date    DATE,
  end_date      DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_client_idx ON projects (client_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);

-- Finanzas (ingresos / egresos)
CREATE TABLE IF NOT EXISTS finance_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects (id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients (id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  category      TEXT,
  amount_cents  BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency      TEXT NOT NULL DEFAULT 'MXN',
  description   TEXT,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_type_idx ON finance_entries (type);
CREATE INDEX IF NOT EXISTS finance_entry_date_idx ON finance_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS finance_project_idx ON finance_entries (project_id);

-- Admin (solo tú; el cliente no ve esto)
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'owner'
                  CHECK (role IN ('owner', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
