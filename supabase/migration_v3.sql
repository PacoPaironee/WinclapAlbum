-- ============================================================================
-- MIGRACIÓN v3 — ÁLBUM DEL MUNDIAL · WINCLAP
-- Agregados: cancelar aporte propio (público), bonus por completar selección,
-- y vista de logros (Cazador de Cocas, La Máquina, El Armador, El Coleccionista).
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente.
-- (Requiere haber corrido antes migration_v2.sql.)
-- ============================================================================

-- ── Columnas nuevas ─────────────────────────────────────────────────────────
alter table aportes add column if not exists puntos_bonus int not null default 0;
alter table aportes add column if not exists completo_seleccion boolean not null default false;

-- ── Público: cancelar un aporte propio mientras está pendiente ───────────────
-- Lo borra y libera las reservas (hueco / repe apartada). Pensado para el dueño.
create or replace function cancelar_aporte_propio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v aportes;
begin
  select * into v from aportes where id = p_id for update;
  if not found then
    raise exception 'El aporte no existe.';
  end if;
  if v.estado <> 'pendiente' then
    raise exception 'Solo podés cancelar un aporte que sigue pendiente.';
  end if;

  if v.tipo = 'nueva' then
    update figuritas set reservada = false where id = v.figurita_id;
  elsif v.tipo = 'cambio' then
    update figuritas set reservada = false where id = v.figurita_id;
    update figuritas set repetidas_reservadas = greatest(repetidas_reservadas - 1, 0)
      where id = v.cambio_figurita_id;
  end if;

  delete from aportes where id = p_id;
end;
$$;
grant execute on function cancelar_aporte_propio(uuid) to anon, authenticated;

-- ── Admin: validar con BONUS por completar una selección ────────────────────
-- Misma lógica que v2 + si el aporte deja su selección 100% pegada, suma un
-- bonus fijo y marca completo_seleccion (lo usa el logro "El Armador").
create or replace function validar_aporte(p_id uuid, p_extra int default 0)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v aportes;
  v_faltantes int;
  v_extra int := greatest(coalesce(p_extra, 0), 0);
  v_total int;
  v_bonus int := 0;
  v_sel uuid;
  v_faltan_sel int;
begin
  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then
    raise exception 'El aporte no existe o ya fue procesado.';
  end if;

  select count(*) into v_faltantes from figuritas where estado = 'faltante';

  -- Aplica el efecto en el álbum
  if v.tipo = 'repe' then
    update figuritas set repetidas = repetidas + 1 where id = v.figurita_id;

  elsif v.tipo = 'nueva' then
    update figuritas set estado='pegada', reservada=false, fecha_pegada=current_date
      where id = v.figurita_id;

  elsif v.tipo = 'cambio' then
    update figuritas set estado='pegada', reservada=false, fecha_pegada=current_date
      where id = v.figurita_id;
    update figuritas set repetidas = greatest(repetidas - 1, 0),
      repetidas_reservadas = greatest(repetidas_reservadas - 1, 0)
      where id = v.cambio_figurita_id;
  end if;

  -- ¿Esta figurita completó su selección? (solo nueva/cambio pegan huecos)
  if v.tipo in ('nueva', 'cambio') then
    select seleccion_id into v_sel from figuritas where id = v.figurita_id;
    if v_sel is not null then
      select count(*) into v_faltan_sel
        from figuritas where seleccion_id = v_sel and estado = 'faltante';
      if v_faltan_sel = 0 then
        v_bonus := 5;  -- bonus por dejar la selección completa
      end if;
    end if;
  end if;

  v_total := calcular_puntos(v.tipo, v_faltantes, v.es_coca) + v_extra + v_bonus;

  update aportes
     set estado='validado', puntos=v_total, puntos_extra=v_extra, puntos_bonus=v_bonus,
         completo_seleccion=(v_bonus > 0),
         faltantes_snapshot=v_faltantes, validado_por=auth.uid(), validado_at=now()
   where id = p_id;

  return v_total;
end;
$$;
grant execute on function validar_aporte(uuid, int) to authenticated;

-- ── Vista de LOGROS — un ganador por logro (solo aportes validados) ──────────
create or replace view v_logros as
with base as (
  select a.clapper_id, a.es_coca, a.completo_seleccion, f.es_especial
  from aportes a
  join figuritas f on f.id = a.figurita_id
  where a.estado = 'validado'
),
coca as (
  select clapper_id, count(*) v from base where es_coca
  group by clapper_id order by count(*) desc, clapper_id limit 1
),
maquina as (
  select clapper_id, count(*) v from base
  group by clapper_id order by count(*) desc, clapper_id limit 1
),
armador as (
  select clapper_id, count(*) v from base where completo_seleccion
  group by clapper_id order by count(*) desc, clapper_id limit 1
),
coleccionista as (
  select clapper_id, count(*) v from base where es_especial
  group by clapper_id order by count(*) desc, clapper_id limit 1
)
select x.clave, x.titulo, x.descripcion, x.emoji, x.clapper_id, cl.nombre as clapper_nombre, x.valor
from (
  select 'cazador_cocas' clave, 'Cazador de Cocas' titulo,
         'Quien más figuritas Coca aportó' descripcion, '🥤' emoji,
         clapper_id, v valor from coca
  union all
  select 'la_maquina', 'La Máquina',
         'Quien más figuritas aportó en total', '⚙️',
         clapper_id, v from maquina
  union all
  select 'el_armador', 'El Armador',
         'Quien más selecciones ayudó a completar', '🎯',
         clapper_id, v from armador
  union all
  select 'el_coleccionista', 'El Coleccionista',
         'Quien más figuritas especiales aportó', '💎',
         clapper_id, v from coleccionista
) x
join clappers cl on cl.id = x.clapper_id
where x.valor > 0;

grant select on v_logros to anon, authenticated;
