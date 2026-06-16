import { createClient } from "@supabase/supabase-js";

// Cliente Supabase SIN sesión (no lee cookies). Se usa dentro de funciones
// cacheadas (unstable_cache), que no pueden acceder a cookies/headers.
// Solo lee datos públicos (RLS permite select anónimo en figuritas/vistas).
export function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
