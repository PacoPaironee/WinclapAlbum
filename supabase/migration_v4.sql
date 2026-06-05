-- ============================================================================
-- MIGRACIÓN v4 — ÁLBUM DEL MUNDIAL · WINCLAP
-- Login con Google restringido a @winclap.com + guard de admin a nivel DB.
-- Solo el admin (franco.pairone@winclap.com) puede validar/rechazar aportes,
-- aunque alguien intente llamar el RPC directamente.
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente.
-- ============================================================================

-- Mail del admin: el del JWT de la sesión actual debe coincidir.
create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'franco.pairone@winclap.com';
$$;

-- ── validar (con guard de admin) ────────────────────────────────────────────
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
  if not is_admin() then
    raise exception 'Solo el admin puede validar aportes.';
  end if;

  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then
    raise exception 'El aporte no existe o ya fue procesado.';
  end if;

  select count(*) into v_faltantes from figuritas where estado = 'faltante';

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

  if v.tipo in ('nueva','cambio') then
    select seleccion_id into v_sel from figuritas where id = v.figurita_id;
    if v_sel is not null then
      select count(*) into v_faltan_sel
        from figuritas where seleccion_id = v_sel and estado = 'faltante';
      if v_faltan_sel = 0 then v_bonus := 5; end if;
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

-- ── rechazar (con guard de admin) ───────────────────────────────────────────
create or replace function rechazar_aporte(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v aportes;
begin
  if not is_admin() then
    raise exception 'Solo el admin puede rechazar aportes.';
  end if;

  select * into v from aportes where id = p_id for update;
  if not found or v.estado <> 'pendiente' then
    raise exception 'El aporte no existe o ya fue procesado.';
  end if;

  update aportes set estado='rechazado', validado_por=auth.uid(), validado_at=now()
   where id = p_id;

  if v.tipo = 'nueva' then
    update figuritas set reservada=false where id=v.figurita_id;
  elsif v.tipo = 'cambio' then
    update figuritas set reservada=false where id=v.figurita_id;
    update figuritas set repetidas_reservadas = greatest(repetidas_reservadas-1,0)
      where id=v.cambio_figurita_id;
  end if;
end;
$$;
grant execute on function rechazar_aporte(uuid) to authenticated;
