-- Cotizaciones Atlas Facility Services
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients (id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects (id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES leads (id) ON DELETE SET NULL,
  client_name     TEXT NOT NULL,
  client_company  TEXT,
  client_email    TEXT,
  client_phone    TEXT,
  client_address  TEXT,
  service_type    TEXT,
  title           TEXT NOT NULL,
  job_description TEXT NOT NULL,
  line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  labor_notes     TEXT,
  materials_notes TEXT,
  conditions      TEXT,
  subtotal_cents  BIGINT NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,4) NOT NULL DEFAULT 0.16,
  tax_cents       BIGINT NOT NULL DEFAULT 0,
  total_cents     BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'MXN',
  valid_days      INT NOT NULL DEFAULT 15,
  valid_until     DATE,
  status          TEXT NOT NULL DEFAULT 'borrador'
                    CHECK (status IN ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida')),
  ai_model        TEXT,
  ai_raw          JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes (status);
CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_client_idx ON quotes (client_id);
CREATE INDEX IF NOT EXISTS quotes_project_idx ON quotes (project_id);

DROP TRIGGER IF EXISTS quotes_updated_at ON quotes;
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
