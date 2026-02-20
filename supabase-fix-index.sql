-- Fix: usar columna generada para el hash (compatible con Supabase JS onConflict)

-- 1. Eliminar el índice md5 que acabamos de crear
DROP INDEX IF EXISTS entries_document_id_text_hash_key;

-- 2. Agregar columna generada que auto-computa el hash
ALTER TABLE entries ADD COLUMN text_hash TEXT GENERATED ALWAYS AS (md5(text)) STORED;

-- 3. Crear índice único sobre la columna generada
CREATE UNIQUE INDEX entries_document_id_text_hash_key
  ON entries (document_id, text_hash);
