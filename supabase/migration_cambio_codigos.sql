-- Migración: agregar columna para registrar qué figuritas se entregan en un "cambio".
-- Correr una sola vez en el SQL editor de Supabase.

alter table aportes
  add column if not exists cambio_codigos text[];
