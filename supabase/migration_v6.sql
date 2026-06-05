-- ============================================================================
-- MIGRACIÓN v6 — ÁLBUM DEL MUNDIAL · WINCLAP
-- Identidad por Google: cada usuario logueado se vincula a un "clapper" por
-- su email. Ya no se elige el nombre a mano; se deriva de la cuenta.
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente.
-- ============================================================================

-- Busca el clapper por email; si no existe lo crea con el nombre de Google.
-- Devuelve el id del clapper. Se llama al cargar el primer aporte.
create or replace function get_or_create_clapper(p_email text, p_nombre text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_nombre text := nullif(trim(coalesce(p_nombre, '')), '');
begin
  if p_email is null or trim(p_email) = '' then
    raise exception 'Falta el email del usuario.';
  end if;

  select id into v_id
    from clappers
   where lower(email) = lower(p_email)
   limit 1;

  if v_id is null then
    insert into clappers (nombre, email)
    values (coalesce(v_nombre, split_part(p_email, '@', 1)), lower(p_email))
    returning id into v_id;
  elsif v_nombre is not null then
    update clappers
       set nombre = v_nombre
     where id = v_id and nombre is distinct from v_nombre;
  end if;

  return v_id;
end;
$$;
grant execute on function get_or_create_clapper(text, text) to authenticated;
