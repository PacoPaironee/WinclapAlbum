-- ============================================================================
-- MIGRACIÓN v7 — ÁLBUM DEL MUNDIAL · WINCLAP
-- Nuevo modelo de puntos (fijo, sin escala por escasez) + categorías:
--   repe = 1 · cambio = 2 · nueva normal = 3
--   nueva formación/escudo (figurita 1 y 13 de cada país) = 4
--   nueva especial (Coca / We Are Panini / FIFA World Cup History) = 5
--   (4 y 5 solo si se dan SIN cambio; en cambio siempre vale 2)
-- + Admin puede sumar/restar puntos a una persona (ajustes_puntos)
-- + Ganadores de logros: +50 al completar el álbum
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente.
-- ============================================================================

-- ── Categoría "formación/escudo": figuritas 1 y 13 de cada país ─────────────
alter table figuritas add column if not exists es_formacion boolean not null default false;

update figuritas set es_formacion = false;  -- reset por si se re-corre
update figuritas
   set es_formacion = true
 where es_especial = false
   and split_part(codigo, ' ', 2) ~ '^[0-9]+$'
   and (split_part(codigo, ' ', 2))::int in (1, 13);

-- ── Nueva función de puntos (fija) ──────────────────────────────────────────
drop function if exists calcular_puntos(tipo_aporte, int, boolean);
drop function if exists calcular_puntos_nueva(int);

create or replace function calcular_puntos(
  p_tipo tipo_aporte, p_es_especial boolean, p_es_formacion boolean
) returns int language sql immutable as $$
  select case p_tipo
    when 'repe'   then 1
    when 'cambio' then 2
    else (case
      when p_es_especial  then 5
      when p_es_formacion then 4
      else 3
    end)
  end;
$$;

-- ── validar_aporte con el nuevo modelo (mantiene bonus por selección) ───────
create or replace function validar_aporte(p_id uuid, p_extra int default 0)
returns int language plpgsql security definer set search_path = public as $$
declare
  v aportes; v_extra int := greatest(coalesce(p_extra, 0), 0); v_total int;
  v_base int; v_bonus int := 0; v_sel uuid; v_faltan_sel int;
  v_esp boolean; v_form boolean;
begin
  if not is_admin() then raise exception 'Solo el admin puede validar aportes.'; end if;
  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then raise exception 'El aporte no existe o ya fue procesado.'; end if;

  select es_especial, es_formacion into v_esp, v_form from figuritas where id = v.figurita_id;
  v_base := calcular_puntos(v.tipo, coalesce(v_esp,false), coalesce(v_form,false));

  if v.tipo = 'repe' then
    update figuritas set repetidas = repetidas + 1 where id = v.figurita_id;
  elsif v.tipo = 'nueva' then
    update figuritas set estado='pegada', reservada=false, fecha_pegada=current_date where id = v.figurita_id;
  elsif v.tipo = 'cambio' then
    update figuritas set estado='pegada', reservada=false, fecha_pegada=current_date where id = v.figurita_id;
    update figuritas set repetidas = greatest(repetidas - 1, 0),
      repetidas_reservadas = greatest(repetidas_reservadas - 1, 0) where id = v.cambio_figurita_id;
  end if;

  if v.tipo in ('nueva','cambio') then
    select seleccion_id into v_sel from figuritas where id = v.figurita_id;
    if v_sel is not null then
      select count(*) into v_faltan_sel from figuritas where seleccion_id = v_sel and estado = 'faltante';
      if v_faltan_sel = 0 then v_bonus := 5; end if;
    end if;
  end if;

  v_total := v_base + v_extra + v_bonus;
  update aportes set estado='validado', puntos=v_total, puntos_extra=v_extra, puntos_bonus=v_bonus,
    completo_seleccion=(v_bonus > 0),
    faltantes_snapshot=(select count(*) from figuritas where estado='faltante'),
    validado_por=auth.uid(), validado_at=now() where id=p_id;
  return v_total;
end; $$;
grant execute on function validar_aporte(uuid, int) to authenticated;

-- ── Ajustes de puntos manuales (admin) + bonus de logros ────────────────────
create table if not exists ajustes_puntos (
  id uuid primary key default gen_random_uuid(),
  clapper_id uuid not null references clappers(id) on delete cascade,
  puntos int not null,
  motivo text,
  clave text unique,                       -- idempotencia (ej 'logro:la_maquina')
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table ajustes_puntos enable row level security;
drop policy if exists aj_read on ajustes_puntos;
create policy aj_read on ajustes_puntos for select to anon, authenticated using (true);
-- (sin policy de insert/update: solo las RPC security definer escriben)

-- Admin: sumar/restar puntos a una persona
create or replace function ajustar_puntos(p_clapper uuid, p_puntos int, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo el admin puede ajustar puntos.'; end if;
  if coalesce(p_puntos,0) = 0 then raise exception 'Indicá un valor distinto de 0.'; end if;
  if not exists (select 1 from clappers where id = p_clapper) then raise exception 'No existe esa persona.'; end if;
  insert into ajustes_puntos (clapper_id, puntos, motivo, created_by)
  values (p_clapper, p_puntos, nullif(trim(coalesce(p_motivo,'')),''), auth.uid());
end; $$;
grant execute on function ajustar_puntos(uuid, int, text) to authenticated;

-- Admin: +50 a cada ganador de logro, solo si el álbum está completo (idempotente)
create or replace function otorgar_bonus_logros()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'Solo el admin.'; end if;
  if exists (select 1 from figuritas where estado = 'faltante') then
    raise exception 'El álbum todavía no está completo.';
  end if;
  insert into ajustes_puntos (clapper_id, puntos, motivo, clave, created_by)
  select clapper_id, 50, 'Logro: ' || titulo, 'logro:' || clave, auth.uid()
  from v_logros
  on conflict (clave) do nothing;
  get diagnostics n = row_count;
  return n;
end; $$;
grant execute on function otorgar_bonus_logros() to authenticated;

-- ── v_ranking incluye los ajustes ───────────────────────────────────────────
create or replace view v_ranking as
with ap as (
  select clapper_id, sum(puntos) as puntos, count(*) as aportes
  from aportes where estado = 'validado' group by clapper_id
),
aj as (
  select clapper_id, sum(puntos) as puntos from ajustes_puntos group by clapper_id
),
base as (
  select c.id as clapper_id, c.nombre,
    coalesce(ap.puntos,0) + coalesce(aj.puntos,0) as puntos,
    coalesce(ap.aportes,0) as aportes
  from clappers c
  left join ap on ap.clapper_id = c.id
  left join aj on aj.clapper_id = c.id
),
suma as (select coalesce(sum(greatest(puntos,0)),0) as total from base)
select clapper_id, nombre, puntos, aportes,
  case when (select total from suma) > 0
    then round(100.0 * greatest(puntos,0) / (select total from suma), 2)
    else 0 end as probabilidad
from base
order by puntos desc, nombre;

grant select on v_ranking to anon, authenticated;
