-- ============================================================================
-- MIGRACIÓN v5 — ÁLBUM DEL MUNDIAL · WINCLAP
-- Permite borrar usuarios de auth sin romper aportes/sorteos:
-- las referencias (validado_por / ejecutado_por) quedan en NULL al borrar.
-- Esto destraba el choque de mail al migrar el admin a login con Google.
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente.
-- ============================================================================

alter table aportes drop constraint if exists aportes_validado_por_fkey;
alter table aportes
  add constraint aportes_validado_por_fkey
  foreign key (validado_por) references auth.users(id) on delete set null;

alter table sorteos drop constraint if exists sorteos_ejecutado_por_fkey;
alter table sorteos
  add constraint sorteos_ejecutado_por_fkey
  foreign key (ejecutado_por) references auth.users(id) on delete set null;
