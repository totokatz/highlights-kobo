-- Migración: MongoDB → Supabase PostgreSQL
-- Correr este SQL en el SQL Editor de Supabase Dashboard

-- 1. Tabla de documentos (libros)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  number_of_pages INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(file, title)
);

-- 2. Tabla de entries (highlights)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL DEFAULT 0,
  time BIGINT,
  color TEXT,
  sort TEXT,
  drawer TEXT,
  chapter TEXT,
  text TEXT NOT NULL,
  note TEXT,
  starred BOOLEAN DEFAULT false,
  UNIQUE(document_id, text)
);

-- 3. Índices para performance
CREATE INDEX idx_entries_document_id ON entries(document_id);
CREATE INDEX idx_documents_title ON documents(title);

-- 4. Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. RLS (Row Level Security) - deshabilitado por ahora ya que usamos service key
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para service role
CREATE POLICY "Service role full access on documents"
  ON documents FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on entries"
  ON entries FOR ALL
  USING (true)
  WITH CHECK (true);
