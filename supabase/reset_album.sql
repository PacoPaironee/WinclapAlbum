-- ============================================================================
-- RESET DEL ÁLBUM — arrancar de cero para el evento real.
-- Borra participación (aportes, ajustes, sorteos, clappers) y deja TODAS las
-- figuritas en "faltante", sin repes ni reservas. CONSERVA el catálogo
-- (figuritas + selecciones). Los usuarios se recrean solos al loguearse.
-- Pegar en Supabase → SQL Editor → Run. (Correr UNA sola vez, antes de empezar.)
-- ============================================================================

begin;

delete from sorteos;
delete from ajustes_puntos;
delete from aportes;
delete from clappers;       -- borra también los de prueba; se recrean al loguear

update figuritas
   set estado = 'faltante',
       repetidas = 0,
       repetidas_reservadas = 0,
       reservada = false,
       fecha_pegada = null;

commit;

-- Chequeos rápidos (deberían dar: figuritas = 994, faltantes = 994, el resto 0)
select
  (select count(*) from figuritas)                         as figuritas,
  (select count(*) from figuritas where estado='faltante') as faltantes,
  (select count(*) from aportes)                           as aportes,
  (select count(*) from clappers)                          as clappers,
  (select count(*) from ajustes_puntos)                    as ajustes;
