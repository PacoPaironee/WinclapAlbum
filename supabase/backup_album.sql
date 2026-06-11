-- ============================================================================
-- BACKUP RÁPIDO (dentro de la misma base) — corré esto cuando quieras una foto
-- de los datos (ej. antes de cualquier operación riesgosa). Crea tablas copia
-- con la fecha/hora en el nombre, ej: bkp_aportes_20260605_1830.
-- Pegar en Supabase → SQL Editor → Run. Se puede correr todas las veces que quieras.
-- ============================================================================

do $$
declare ts text := to_char(now(), 'YYYYMMDD_HH24MI');
begin
  execute format('create table public.bkp_aportes_%s   as table aportes',        ts);
  execute format('create table public.bkp_clappers_%s  as table clappers',       ts);
  execute format('create table public.bkp_figuritas_%s as table figuritas',      ts);
  execute format('create table public.bkp_ajustes_%s   as table ajustes_puntos', ts);
  execute format('create table public.bkp_sorteos_%s   as table sorteos',        ts);
  raise notice 'Backup creado con sufijo %', ts;
end $$;

-- Ver los backups que tenés guardados:
--   select table_name from information_schema.tables
--   where table_schema='public' and table_name like 'bkp_%' order by table_name;

-- ── RESTAURAR (ejemplo) ─────────────────────────────────────────────────────
-- Si necesitás volver atrás los aportes a una foto (reemplazá el sufijo):
--   begin;
--   delete from aportes;
--   insert into aportes select * from public.bkp_aportes_20260605_1830;
--   commit;

-- ── BORRAR backups viejos (para no acumular) ────────────────────────────────
--   drop table if exists public.bkp_aportes_20260605_1830;
