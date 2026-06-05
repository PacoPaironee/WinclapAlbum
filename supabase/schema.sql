-- ============================================================================
-- ÁLBUM DEL MUNDIAL · WINCLAP — Schema de base de datos
-- Pegar TODO este archivo en Supabase → SQL Editor → Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  create type tipo_aporte as enum ('repe', 'cambio', 'nueva');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_aporte as enum ('pendiente', 'validado', 'rechazado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_figurita as enum ('faltante', 'pegada');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABLAS
-- ============================================================================

create table if not exists selecciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  grupo text,
  orden int not null default 0,
  color text default '#1CC9B9',
  created_at timestamptz default now()
);

create table if not exists figuritas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text,                                   -- jugador (opcional, se completa después)
  seleccion_id uuid references selecciones(id) on delete cascade,
  es_coca boolean not null default false,        -- (legacy) figuritas Coca
  es_especial boolean not null default false,    -- Coca / We Are Panini / FWC (5 pts)
  es_formacion boolean not null default false,   -- formación/escudo: 1 y 13 de cada país (4 pts)
  estado estado_figurita not null default 'faltante',
  repetidas int not null default 0,
  repetidas_reservadas int not null default 0,   -- repes apartadas por cambios pendientes
  reservada boolean not null default false,       -- hueco apartado por una nueva/cambio pendiente
  fecha_pegada date,
  created_at timestamptz default now()
);

create index if not exists idx_figuritas_seleccion on figuritas(seleccion_id);
create index if not exists idx_figuritas_estado on figuritas(estado);

create table if not exists clappers (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text,
  created_at timestamptz default now()
);

create table if not exists aportes (
  id uuid primary key default gen_random_uuid(),
  clapper_id uuid not null references clappers(id) on delete cascade,
  figurita_id uuid not null references figuritas(id) on delete cascade,
  tipo tipo_aporte not null,
  es_coca boolean not null default false,        -- snapshot al momento del aporte
  puntos int not null default 0,                 -- se fija al validar
  faltantes_snapshot int,                        -- faltantes al momento de validar
  estado estado_aporte not null default 'pendiente',
  puntos_extra int not null default 0,           -- puntos extra a criterio del admin
  puntos_bonus int not null default 0,           -- bonus por completar una selección
  completo_seleccion boolean not null default false, -- dejó su selección 100% pegada
  cambio_figurita_id uuid references figuritas(id), -- si es 'cambio': repe de Winclap que se lleva
  cambio_codigos text[],                         -- (legacy, sin uso)
  comentario text,
  created_at timestamptz default now(),
  validado_por uuid references auth.users(id) on delete set null,
  validado_at timestamptz
);

create index if not exists idx_aportes_estado on aportes(estado);
create index if not exists idx_aportes_clapper on aportes(clapper_id);

create table if not exists sorteos (
  id uuid primary key default gen_random_uuid(),
  ganador_clapper_id uuid references clappers(id),
  ganador_nombre text,
  seed text,
  total_puntos int,
  snapshot jsonb,
  ejecutado_at timestamptz default now(),
  ejecutado_por uuid references auth.users(id) on delete set null
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Lectura pública (anon). Carga de aportes pública (siempre 'pendiente').
-- El resto de las escrituras, solo el admin autenticado.
-- ============================================================================
alter table selecciones enable row level security;
alter table figuritas   enable row level security;
alter table clappers    enable row level security;
alter table aportes     enable row level security;
alter table sorteos     enable row level security;

-- selecciones: lectura pública, escritura admin
drop policy if exists sel_read on selecciones;
create policy sel_read on selecciones for select to anon, authenticated using (true);
drop policy if exists sel_write on selecciones;
create policy sel_write on selecciones for all to authenticated using (true) with check (true);

-- figuritas: lectura pública, escritura admin
drop policy if exists fig_read on figuritas;
create policy fig_read on figuritas for select to anon, authenticated using (true);
drop policy if exists fig_write on figuritas;
create policy fig_write on figuritas for all to authenticated using (true) with check (true);

-- clappers: lectura pública, alta pública (para sumarse), edición admin
drop policy if exists cla_read on clappers;
create policy cla_read on clappers for select to anon, authenticated using (true);
drop policy if exists cla_insert on clappers;
create policy cla_insert on clappers for insert to anon, authenticated with check (true);
drop policy if exists cla_update on clappers;
create policy cla_update on clappers for update to authenticated using (true) with check (true);
drop policy if exists cla_delete on clappers;
create policy cla_delete on clappers for delete to authenticated using (true);

-- aportes: lectura pública (feed), alta pública solo en estado 'pendiente', resto admin
drop policy if exists apo_read on aportes;
create policy apo_read on aportes for select to anon, authenticated using (true);
drop policy if exists apo_insert on aportes;
create policy apo_insert on aportes for insert to anon, authenticated
  with check (estado = 'pendiente' and puntos = 0);
drop policy if exists apo_update on aportes;
create policy apo_update on aportes for update to authenticated using (true) with check (true);
drop policy if exists apo_delete on aportes;
create policy apo_delete on aportes for delete to authenticated using (true);

-- sorteos: lectura pública, escritura admin
drop policy if exists sor_read on sorteos;
create policy sor_read on sorteos for select to anon, authenticated using (true);
drop policy if exists sor_write on sorteos;
create policy sor_write on sorteos for all to authenticated using (true) with check (true);

-- ============================================================================
-- VISTAS
-- ============================================================================
create or replace view v_progreso as
select
  count(*)                                              as total,
  count(*) filter (where estado = 'pegada')            as pegadas,
  count(*) filter (where estado = 'faltante')          as faltantes,
  coalesce(sum(repetidas), 0)                          as repetidas,
  coalesce(round(100.0 * count(*) filter (where estado = 'pegada')
    / nullif(count(*), 0), 1), 0)                      as porcentaje
from figuritas;

create or replace view v_progreso_seleccion as
select
  s.id                                                 as seleccion_id,
  s.nombre,
  s.grupo,
  s.orden,
  s.color,
  count(f.*)                                           as total,
  count(f.*) filter (where f.estado = 'pegada')        as pegadas,
  count(f.*) filter (where f.estado = 'faltante')      as faltantes,
  coalesce(sum(f.repetidas), 0)                        as repetidas
from selecciones s
left join figuritas f on f.seleccion_id = s.id
group by s.id, s.nombre, s.grupo, s.orden, s.color
order by s.orden;

-- Ajustes de puntos manuales (admin) y bonus de logros. Definida acá porque
-- v_ranking la usa. RLS + RPC de escritura más abajo.
create table if not exists ajustes_puntos (
  id uuid primary key default gen_random_uuid(),
  clapper_id uuid not null references clappers(id) on delete cascade,
  puntos int not null,
  motivo text,
  clave text unique,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table ajustes_puntos enable row level security;
drop policy if exists aj_read on ajustes_puntos;
create policy aj_read on ajustes_puntos for select to anon, authenticated using (true);

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

create or replace view v_logros as
with base as (
  select a.clapper_id, a.es_coca, a.completo_seleccion, f.es_especial
  from aportes a join figuritas f on f.id = a.figurita_id
  where a.estado = 'validado'
),
coca as (select clapper_id, count(*) v from base where es_coca group by clapper_id order by count(*) desc, clapper_id limit 1),
maquina as (select clapper_id, count(*) v from base group by clapper_id order by count(*) desc, clapper_id limit 1),
armador as (select clapper_id, count(*) v from base where completo_seleccion group by clapper_id order by count(*) desc, clapper_id limit 1),
coleccionista as (select clapper_id, count(*) v from base where es_especial group by clapper_id order by count(*) desc, clapper_id limit 1)
select x.clave, x.titulo, x.descripcion, x.emoji, x.clapper_id, cl.nombre as clapper_nombre, x.valor
from (
  select 'cazador_cocas' clave, 'Cazador de Cocas' titulo, 'Quien más figuritas Coca aportó' descripcion, '🥤' emoji, clapper_id, v valor from coca
  union all select 'la_maquina', 'La Máquina', 'Quien más figuritas aportó en total', '⚙️', clapper_id, v from maquina
  union all select 'el_armador', 'El Armador', 'Quien más selecciones ayudó a completar', '🎯', clapper_id, v from armador
  union all select 'el_coleccionista', 'El Coleccionista', 'Quien más figuritas especiales aportó', '💎', clapper_id, v from coleccionista
) x
join clappers cl on cl.id = x.clapper_id
where x.valor > 0;

grant select on v_progreso, v_progreso_seleccion, v_ranking, v_logros to anon, authenticated;

-- ============================================================================
-- FUNCIONES (RPC) — solicitar / validar / rechazar de forma atómica
-- (ver supabase/migration_v2.sql para los detalles; acá van inline)
-- ============================================================================
-- Puntos fijos por tipo + categoría de la figurita.
-- repe=1 · cambio=2 · nueva: especial=5, formación/escudo=4, normal=3
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

create or replace function solicitar_aportes(p_clapper uuid, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  it jsonb; v_fig figuritas; v_cmb figuritas; v_tipo tipo_aporte; v_count int := 0;
begin
  if not exists (select 1 from clappers where id = p_clapper) then
    raise exception 'Elegí un participante válido.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregá al menos una figurita.';
  end if;
  for it in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := (it->>'tipo')::tipo_aporte;
    select * into v_fig from figuritas where id = (it->>'figurita_id')::uuid for update;
    if not found then raise exception 'Una figurita no existe.'; end if;
    if v_tipo = 'repe' then
      if v_fig.estado <> 'pegada' then
        raise exception 'Solo podés traer una repe de una figurita ya pegada (%).', v_fig.codigo;
      end if;
      insert into aportes (clapper_id, figurita_id, tipo, es_coca, comentario)
      values (p_clapper, v_fig.id, 'repe', v_fig.es_coca, nullif(trim(it->>'comentario'), ''));
    elsif v_tipo = 'nueva' then
      if v_fig.estado <> 'faltante' then raise exception 'La figurita % ya está pegada.', v_fig.codigo; end if;
      if v_fig.reservada then raise exception 'La figurita % ya está reservada.', v_fig.codigo; end if;
      insert into aportes (clapper_id, figurita_id, tipo, es_coca, comentario)
      values (p_clapper, v_fig.id, 'nueva', v_fig.es_coca, nullif(trim(it->>'comentario'), ''));
      update figuritas set reservada = true where id = v_fig.id;
    elsif v_tipo = 'cambio' then
      if v_fig.estado <> 'faltante' then raise exception 'La figurita % ya está pegada.', v_fig.codigo; end if;
      if v_fig.reservada then raise exception 'La figurita % ya está reservada.', v_fig.codigo; end if;
      select * into v_cmb from figuritas where id = (it->>'cambio_figurita_id')::uuid for update;
      if not found then raise exception 'Elegí por qué repe la cambiás.'; end if;
      if (v_cmb.repetidas - v_cmb.repetidas_reservadas) <= 0 then
        raise exception 'La repe % ya no está disponible.', v_cmb.codigo;
      end if;
      insert into aportes (clapper_id, figurita_id, tipo, es_coca, comentario, cambio_figurita_id)
      values (p_clapper, v_fig.id, 'cambio', v_fig.es_coca, nullif(trim(it->>'comentario'), ''), v_cmb.id);
      update figuritas set reservada = true where id = v_fig.id;
      update figuritas set repetidas_reservadas = repetidas_reservadas + 1 where id = v_cmb.id;
    else
      raise exception 'Tipo de aporte inválido.';
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
grant execute on function solicitar_aportes(uuid, jsonb) to anon, authenticated;

create or replace function is_admin()
returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'franco.pairone@winclap.com';
$$;

-- Identidad por Google: vincula el usuario logueado a un clapper por email.
create or replace function get_or_create_clapper(p_email text, p_nombre text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nombre text := nullif(trim(coalesce(p_nombre, '')), '');
begin
  if p_email is null or trim(p_email) = '' then raise exception 'Falta el email del usuario.'; end if;
  select id into v_id from clappers where lower(email) = lower(p_email) limit 1;
  if v_id is null then
    insert into clappers (nombre, email)
    values (coalesce(v_nombre, split_part(p_email, '@', 1)), lower(p_email))
    returning id into v_id;
  elsif v_nombre is not null then
    update clappers set nombre = v_nombre where id = v_id and nombre is distinct from v_nombre;
  end if;
  return v_id;
end; $$;
grant execute on function get_or_create_clapper(text, text) to authenticated;

create or replace function validar_aporte(p_id uuid, p_extra int default 0)
returns int language plpgsql security definer set search_path = public as $$
declare
  v aportes; v_extra int := greatest(coalesce(p_extra, 0), 0); v_total int;
  v_base int; v_bonus int := 0; v_sel uuid; v_faltan_sel int; v_esp boolean; v_form boolean;
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

-- Ajustes de puntos manuales + bonus de logros (la tabla se define más arriba)
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
  from v_logros on conflict (clave) do nothing;
  get diagnostics n = row_count;
  return n;
end; $$;
grant execute on function otorgar_bonus_logros() to authenticated;

create or replace function rechazar_aporte(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v aportes;
begin
  if not is_admin() then raise exception 'Solo el admin puede rechazar aportes.'; end if;
  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then raise exception 'El aporte no existe o ya fue procesado.'; end if;
  update aportes set estado='rechazado', validado_por=auth.uid(), validado_at=now() where id=p_id;
  if v.tipo = 'nueva' then
    update figuritas set reservada=false where id=v.figurita_id;
  elsif v.tipo = 'cambio' then
    update figuritas set reservada=false where id=v.figurita_id;
    update figuritas set repetidas_reservadas = greatest(repetidas_reservadas-1,0) where id=v.cambio_figurita_id;
  end if;
end; $$;
grant execute on function rechazar_aporte(uuid) to authenticated;

-- Público: cancelar un aporte propio pendiente (lo borra y libera reservas)
create or replace function cancelar_aporte_propio(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v aportes;
begin
  select * into v from aportes where id = p_id for update;
  if not found then raise exception 'El aporte no existe.'; end if;
  if v.estado <> 'pendiente' then raise exception 'Solo podés cancelar un aporte que sigue pendiente.'; end if;
  if v.tipo = 'nueva' then
    update figuritas set reservada=false where id=v.figurita_id;
  elsif v.tipo = 'cambio' then
    update figuritas set reservada=false where id=v.figurita_id;
    update figuritas set repetidas_reservadas = greatest(repetidas_reservadas-1,0) where id=v.cambio_figurita_id;
  end if;
  delete from aportes where id = p_id;
end; $$;
grant execute on function cancelar_aporte_propio(uuid) to anon, authenticated;

-- ============================================================================
-- SEED — el catálogo real del álbum está en supabase/seed_album_real.sql
-- (51 secciones · 994 figuritas). Correr ESE archivo después del schema.
-- ============================================================================
