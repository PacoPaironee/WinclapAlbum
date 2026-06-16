import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anonClient } from "@/lib/supabase/anon";
import type {
  Progreso,
  ProgresoSeleccion,
  Seleccion,
  Figurita,
  Clapper,
  RankingRow,
  Logro,
} from "@/lib/types";

// Las lecturas públicas (álbum, ranking, etc.) se cachean y se refrescan solas
// cuando el admin valida/ajusta algo (revalidateTag("album") en las actions).
// "revalidate" es el respaldo: si algo no invalidó, igual se refresca solo.
const CACHE = { tags: ["album"], revalidate: 30 };

export type FiguritaConSeleccion = Figurita & {
  selecciones: Pick<Seleccion, "nombre" | "color" | "grupo" | "orden"> | null;
};

// Orden natural: por selección y luego por el número del código (1,2,…,10,…,20)
function codeParts(codigo: string): [string, number] {
  const m = codigo.match(/^(.*?)(\d+)\s*$/);
  if (!m) return [codigo, 0];
  return [m[1].trim(), parseInt(m[2], 10)];
}

export function compareFiguritas(
  a: FiguritaConSeleccion,
  b: FiguritaConSeleccion,
): number {
  const oa = a.selecciones?.orden ?? 9999;
  const ob = b.selecciones?.orden ?? 9999;
  if (oa !== ob) return oa - ob;
  const [pa, na] = codeParts(a.codigo);
  const [pb, nb] = codeParts(b.codigo);
  if (pa !== pb) return pa.localeCompare(pb);
  return na - nb;
}

export const getProgreso = unstable_cache(
  async (): Promise<Progreso> => {
    const { data } = await anonClient().from("v_progreso").select("*").single();
    return (
      data ?? { total: 0, pegadas: 0, faltantes: 0, repetidas: 0, porcentaje: 0 }
    );
  },
  ["progreso"],
  CACHE,
);

export const getProgresoSelecciones = unstable_cache(
  async (): Promise<ProgresoSeleccion[]> => {
    const { data } = await anonClient()
      .from("v_progreso_seleccion")
      .select("*")
      .order("orden");
    return data ?? [];
  },
  ["progreso_seleccion"],
  CACHE,
);

export const getSelecciones = unstable_cache(
  async (): Promise<Seleccion[]> => {
    const { data } = await anonClient()
      .from("selecciones")
      .select("*")
      .order("orden");
    return data ?? [];
  },
  ["selecciones"],
  CACHE,
);

export const getFiguritas = unstable_cache(
  async (filtros: {
    seleccion?: string;
    estado?: string;
  }): Promise<FiguritaConSeleccion[]> => {
    let query = anonClient()
      .from("figuritas")
      .select("*, selecciones(nombre, color, grupo, orden)");

    if (filtros.seleccion) query = query.eq("seleccion_id", filtros.seleccion);
    if (filtros.estado === "faltante") query = query.eq("estado", "faltante");
    if (filtros.estado === "pegada") query = query.eq("estado", "pegada");
    if (filtros.estado === "repe") query = query.gt("repetidas", 0);
    if (filtros.estado === "especial") query = query.eq("es_especial", true);
    if (filtros.estado === "formacion") query = query.eq("es_formacion", true);

    const { data } = await query;
    return ((data as FiguritaConSeleccion[]) ?? []).sort(compareFiguritas);
  },
  ["figuritas"],
  CACHE,
);

export const getRepes = unstable_cache(
  async (): Promise<FiguritaConSeleccion[]> => {
    const { data } = await anonClient()
      .from("figuritas")
      .select("*, selecciones(nombre, color, grupo, orden)")
      .gt("repetidas", 0)
      .order("repetidas", { ascending: false });
    return (data as FiguritaConSeleccion[]) ?? [];
  },
  ["repes"],
  CACHE,
);

export const getFaltantes = unstable_cache(
  async (): Promise<FiguritaConSeleccion[]> => {
    const { data } = await anonClient()
      .from("figuritas")
      .select("*, selecciones(nombre, color, grupo, orden)")
      .eq("estado", "faltante");
    return ((data as FiguritaConSeleccion[]) ?? []).sort(compareFiguritas);
  },
  ["faltantes"],
  CACHE,
);

export const getRanking = unstable_cache(
  async (): Promise<RankingRow[]> => {
    const { data } = await anonClient().from("v_ranking").select("*");
    return data ?? [];
  },
  ["ranking"],
  CACHE,
);

export const getLogros = unstable_cache(
  async (): Promise<Logro[]> => {
    const { data } = await anonClient().from("v_logros").select("*");
    return (data as Logro[]) ?? [];
  },
  ["logros"],
  CACHE,
);

// Ranking + email (para resolver la identidad sin pegarle a la base en cada
// navegación). Cacheado con el mismo tag "album".
const getRankingFull = unstable_cache(
  async (): Promise<
    { clapper_id: string; email: string | null; puntos: number; aportes: number }[]
  > => {
    const sb = anonClient();
    const [cl, rk] = await Promise.all([
      sb.from("clappers").select("id, email"),
      sb.from("v_ranking").select("clapper_id, puntos, aportes"),
    ]);
    const rkMap = new Map(
      (rk.data ?? []).map((r) => [r.clapper_id, r] as const),
    );
    return (cl.data ?? []).map((c) => ({
      clapper_id: c.id as string,
      email: (c.email as string | null) ?? null,
      puntos: rkMap.get(c.id)?.puntos ?? 0,
      aportes: rkMap.get(c.id)?.aportes ?? 0,
    }));
  },
  ["ranking_full"],
  CACHE,
);

export type Identity = {
  email: string;
  nombre: string;
  clapperId: string | null;
  puntos: number;
  aportes: number;
};

// Identidad del usuario logueado (Google). El clapper se resuelve por email;
// puede no existir todavía si nunca aportó (clapperId = null).
export async function getIdentity(): Promise<Identity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const meta = user.user_metadata ?? {};
  const nombre =
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email.split("@")[0];

  // Puntos/clapper salen del ranking cacheado (no consulta la base por click)
  const email = user.email.toLowerCase();
  const full = await getRankingFull();
  const row = full.find((r) => (r.email ?? "").toLowerCase() === email);

  return {
    email: user.email,
    nombre,
    clapperId: row?.clapper_id ?? null,
    puntos: row?.puntos ?? 0,
    aportes: row?.aportes ?? 0,
  };
}

export const getClappers = unstable_cache(
  async (): Promise<Clapper[]> => {
    const { data } = await anonClient()
      .from("clappers")
      .select("*")
      .order("nombre");
    return data ?? [];
  },
  ["clappers"],
  CACHE,
);

type FiguritaMini =
  | (Pick<
      Figurita,
      "codigo" | "nombre" | "estado" | "es_coca" | "es_especial" | "es_formacion"
    > & {
      selecciones: { nombre: string } | null;
    })
  | null;

export type AporteDetalle = {
  id: string;
  tipo: string;
  es_coca: boolean;
  puntos: number;
  puntos_extra: number;
  puntos_bonus: number;
  completo_seleccion: boolean;
  estado: string;
  comentario: string | null;
  created_at: string;
  clappers: { nombre: string } | null;
  figuritas: FiguritaMini;
  cambio_fig: FiguritaMini;
};

const APORTE_SELECT =
  "id, tipo, es_coca, puntos, puntos_extra, puntos_bonus, completo_seleccion, estado, comentario, created_at, " +
  "clappers(nombre), " +
  "figuritas:figuritas!aportes_figurita_id_fkey(codigo, nombre, estado, es_coca, es_especial, es_formacion, selecciones(nombre)), " +
  "cambio_fig:figuritas!aportes_cambio_figurita_id_fkey(codigo, nombre, estado, es_coca, es_especial, es_formacion, selecciones(nombre))";

export async function getPendientes(): Promise<AporteDetalle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aportes")
    .select(APORTE_SELECT)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });
  return (data as unknown as AporteDetalle[]) ?? [];
}

export type AjustePunto = {
  id: string;
  puntos: number;
  motivo: string | null;
  clave: string | null;
  created_at: string;
};

export async function getClapperAjustes(
  clapperId: string,
): Promise<AjustePunto[]> {
  if (!clapperId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("ajustes_puntos")
    .select("id, puntos, motivo, clave, created_at")
    .eq("clapper_id", clapperId)
    .order("created_at", { ascending: false });
  return (data as AjustePunto[]) ?? [];
}

export async function getClapperAportes(
  clapperId: string,
): Promise<AporteDetalle[]> {
  if (!clapperId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("aportes")
    .select(APORTE_SELECT)
    .eq("clapper_id", clapperId)
    .order("created_at", { ascending: false });
  return (data as unknown as AporteDetalle[]) ?? [];
}

export async function getFeed(limit = 15): Promise<AporteDetalle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aportes")
    .select(APORTE_SELECT)
    .eq("estado", "validado")
    .order("validado_at", { ascending: false })
    .limit(limit);
  return (data as unknown as AporteDetalle[]) ?? [];
}

export async function getUltimoSorteo() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sorteos")
    .select("*")
    .order("ejecutado_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
