-- ============================================================================
-- MIGRACIÓN v2 — ÁLBUM DEL MUNDIAL · WINCLAP
-- Puntos extra (admin), cambio estructurado (1:1), reservas/suspensión,
-- y funciones (RPC) para solicitar/validar/rechazar de forma atómica.
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente.
-- ============================================================================

-- ── Columnas nuevas ─────────────────────────────────────────────────────────
alter table aportes  add column if not exists puntos_extra int not null default 0;
alter table aportes  add column if not exists cambio_figurita_id uuid references figuritas(id);

alter table figuritas add column if not exists reservada boolean not null default false;
alter table figuritas add column if not exists repetidas_reservadas int not null default 0;

-- ── Escala de puntos en SQL (igual a src/lib/points.ts) ─────────────────────
create or replace function calcular_puntos_nueva(p_faltantes int)
returns int language sql immutable as $$
  select case
    when p_faltantes >= 250 then 3
    when p_faltantes >= 100 then 4
    when p_faltantes >= 50  then 5
    when p_faltantes >= 10  then 8
    else 10
  end;
$$;

create or replace function calcular_puntos(p_tipo tipo_aporte, p_faltantes int, p_es_coca boolean)
returns int language sql immutable as $$
  select (case p_tipo
    when 'repe'   then 1
    when 'cambio' then 2
    else calcular_puntos_nueva(p_faltantes)
  end) * (case when p_es_coca then 2 else 1 end);
$$;

-- ── Público: solicitar uno o varios aportes (quedan pendientes + reservas) ───
-- p_items: jsonb array de { figurita_id, tipo, cambio_figurita_id?, comentario? }
create or replace function solicitar_aportes(p_clapper uuid, p_items jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  it    jsonb;
  v_fig figuritas;
  v_cmb figuritas;
  v_tipo tipo_aporte;
  v_count int := 0;
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
      if v_fig.estado <> 'faltante' then
        raise exception 'La figurita % ya está pegada.', v_fig.codigo;
      end if;
      if v_fig.reservada then
        raise exception 'La figurita % ya está reservada por otro aporte.', v_fig.codigo;
      end if;
      insert into aportes (clapper_id, figurita_id, tipo, es_coca, comentario)
      values (p_clapper, v_fig.id, 'nueva', v_fig.es_coca, nullif(trim(it->>'comentario'), ''));
      update figuritas set reservada = true where id = v_fig.id;

    elsif v_tipo = 'cambio' then
      if v_fig.estado <> 'faltante' then
        raise exception 'La figurita % ya está pegada.', v_fig.codigo;
      end if;
      if v_fig.reservada then
        raise exception 'La figurita % ya está reservada por otro aporte.', v_fig.codigo;
      end if;
      select * into v_cmb from figuritas where id = (it->>'cambio_figurita_id')::uuid for update;
      if not found then raise exception 'Elegí por qué repe de Winclap la cambiás.'; end if;
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
end;
$$;
grant execute on function solicitar_aportes(uuid, jsonb) to anon, authenticated;

-- ── Admin: validar (fija puntos = base + extra y aplica el efecto) ───────────
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
begin
  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then
    raise exception 'El aporte no existe o ya fue procesado.';
  end if;

  select count(*) into v_faltantes from figuritas where estado = 'faltante';
  v_total := calcular_puntos(v.tipo, v_faltantes, v.es_coca) + v_extra;

  update aportes
     set estado = 'validado',
         puntos = v_total,
         puntos_extra = v_extra,
         faltantes_snapshot = v_faltantes,
         validado_por = auth.uid(),
         validado_at = now()
   where id = p_id;

  if v.tipo = 'repe' then
    update figuritas set repetidas = repetidas + 1 where id = v.figurita_id;

  elsif v.tipo = 'nueva' then
    update figuritas
       set estado = 'pegada', reservada = false, fecha_pegada = current_date
     where id = v.figurita_id;

  elsif v.tipo = 'cambio' then
    -- entra la nueva al álbum
    update figuritas
       set estado = 'pegada', reservada = false, fecha_pegada = current_date
     where id = v.figurita_id;
    -- sale la repe de Winclap
    update figuritas
       set repetidas = greatest(repetidas - 1, 0),
           repetidas_reservadas = greatest(repetidas_reservadas - 1, 0)
     where id = v.cambio_figurita_id;
  end if;

  return v_total;
end;
$$;
grant execute on function validar_aporte(uuid, int) to authenticated;

-- ── Admin: rechazar (libera las reservas) ───────────────────────────────────
create or replace function rechazar_aporte(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v aportes;
begin
  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then
    raise exception 'El aporte no existe o ya fue procesado.';
  end if;

  update aportes
     set estado = 'rechazado', validado_por = auth.uid(), validado_at = now()
   where id = p_id;

  if v.tipo = 'nueva' then
    update figuritas set reservada = false where id = v.figurita_id;
  elsif v.tipo = 'cambio' then
    update figuritas set reservada = false where id = v.figurita_id;
    update figuritas set repetidas_reservadas = greatest(repetidas_reservadas - 1, 0)
      where id = v.cambio_figurita_id;
  end if;
end;
$$;
grant execute on function rechazar_aporte(uuid) to authenticated;
