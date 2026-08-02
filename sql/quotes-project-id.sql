-- Migración: vincular cotizaciones a proyectos
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotes_project_idx ON quotes (project_id);
