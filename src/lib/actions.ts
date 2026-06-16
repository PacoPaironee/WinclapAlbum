"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoAporte } from "@/lib/types";

export type FormState = { ok?: boolean; error?: string; message?: string };

function revalidarTodo() {
  // Invalida las lecturas cacheadas (álbum, ranking, faltantes, identidad…)
  revalidateTag("album", "max");
  revalidatePath("/");
  revalidatePath("/album");
  revalidatePath("/repes");
  revalidatePath("/faltantes");
  revalidatePath("/ranking");
  revalidatePath("/mis-aportes");
  revalidatePath("/admin");
  revalidatePath("/admin/figuritas");
  revalidatePath("/admin/clappers");
}

// ── Público: solicitar varios aportes de una (quedan pendientes + reservas) ──
type ItemAporte = {
  figurita_id: string;
  tipo: TipoAporte;
  cambio_figurita_id?: string;
  comentario?: string;
};

export async function crearAportes(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();

  // El usuario logueado (Google) es quien aporta. Resolvemos su clapper.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Tenés que iniciar sesión." };

  const meta = user.user_metadata ?? {};
  const nombre =
    (meta.full_name as string) || (meta.name as string) || null;

  const { data: clapperId, error: cErr } = await supabase.rpc(
    "get_or_create_clapper",
    { p_email: user.email, p_nombre: nombre },
  );
  if (cErr || !clapperId)
    return { error: cErr?.message || "No pudimos identificar tu usuario." };

  // Lista de figuritas que se cargan (serializada en JSON desde el cliente)
  let items: ItemAporte[];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "No se pudo leer la lista de figuritas." };
  }
  if (!Array.isArray(items) || items.length === 0)
    return { error: "Agregá al menos una figurita." };

  for (const it of items) {
    if (!it.figurita_id) return { error: "Hay una figurita sin elegir." };
    if (!["repe", "cambio", "nueva"].includes(it.tipo))
      return { error: "Cada figurita necesita un tipo de aporte." };
    if (it.tipo === "cambio" && !it.cambio_figurita_id)
      return { error: "En un cambio, elegí por qué repe lo cambiás." };
  }

  // La función SQL valida estado/reservas y hace todo de forma atómica
  const { data, error } = await supabase.rpc("solicitar_aportes", {
    p_clapper: clapperId,
    p_items: items,
  });
  if (error) return { error: error.message || "No se pudieron registrar." };

  const n = typeof data === "number" ? data : items.length;
  revalidarTodo();
  return {
    ok: true,
    message: `¡${n} ${
      n === 1 ? "aporte cargado" : "aportes cargados"
    }! Quedan pendientes de validación.`,
  };
}

// ── Admin: validar un aporte (fija puntos = base + extra y aplica el efecto) ─
export async function validarAporte(
  aporteId: string,
  puntosExtra = 0,
): Promise<FormState> {
  const supabase = await createClient();
  const extra = Number.isFinite(puntosExtra) ? Math.max(0, Math.trunc(puntosExtra)) : 0;

  const { data, error } = await supabase.rpc("validar_aporte", {
    p_id: aporteId,
    p_extra: extra,
  });
  if (error) return { error: error.message || "No se pudo validar el aporte." };

  revalidarTodo();
  return { ok: true, message: `Validado · +${data ?? ""} puntos` };
}

// ── Público: cancelar un aporte propio mientras está pendiente ───────────────
export async function cancelarAportePropio(
  aporteId: string,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_aporte_propio", {
    p_id: aporteId,
  });
  if (error) return { error: error.message || "No se pudo cancelar." };
  revalidarTodo();
  return { ok: true, message: "Aporte cancelado." };
}

export async function rechazarAporte(aporteId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rechazar_aporte", { p_id: aporteId });
  if (error) return { error: error.message || "No se pudo rechazar." };
  revalidarTodo();
  return { ok: true };
}

// ── Admin: sumar/restar puntos a una persona ────────────────────────────────
export async function ajustarPuntos(
  clapperId: string,
  puntos: number,
  motivo?: string,
): Promise<FormState> {
  const supabase = await createClient();
  const n = Math.trunc(Number(puntos) || 0);
  if (n === 0) return { error: "Indicá un valor distinto de 0." };
  const { error } = await supabase.rpc("ajustar_puntos", {
    p_clapper: clapperId,
    p_puntos: n,
    p_motivo: motivo ?? null,
  });
  if (error) return { error: error.message || "No se pudo ajustar." };
  revalidarTodo();
  return { ok: true, message: `Ajuste de ${n > 0 ? "+" : ""}${n} aplicado.` };
}

// ── Admin: +50 a cada ganador de logro (solo álbum completo) ─────────────────
export async function otorgarBonusLogros(): Promise<
  FormState & { otorgados?: number }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("otorgar_bonus_logros");
  if (error) return { error: error.message || "No se pudo otorgar." };
  revalidarTodo();
  const n = typeof data === "number" ? data : 0;
  return {
    ok: true,
    otorgados: n,
    message:
      n > 0
        ? `Otorgados +50 a ${n} ganador${n === 1 ? "" : "es"} de logros.`
        : "Los bonus de logros ya estaban otorgados.",
  };
}

// ── Admin: ABM de figuritas ─────────────────────────────────────────────────
export async function setEstadoFigurita(
  figuritaId: string,
  estado: "faltante" | "pegada",
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("figuritas")
    .update({
      estado,
      fecha_pegada: estado === "pegada" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", figuritaId);
  if (error) return { error: "No se pudo actualizar." };
  revalidarTodo();
  return { ok: true };
}

export async function setRepetidas(
  figuritaId: string,
  repetidas: number,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("figuritas")
    .update({ repetidas: Math.max(0, repetidas) })
    .eq("id", figuritaId);
  if (error) return { error: "No se pudo actualizar." };
  revalidarTodo();
  return { ok: true };
}

// ── Admin: ABM de clappers ──────────────────────────────────────────────────
export async function crearClapper(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  if (!nombre) return { error: "Falta el nombre." };
  const { error } = await supabase.from("clappers").insert({ nombre, email });
  if (error) return { error: "No se pudo crear." };
  revalidateTag("album", "max");
  revalidatePath("/admin/clappers");
  return { ok: true, message: "Clapper agregado." };
}

export async function borrarClapper(clapperId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("clappers").delete().eq("id", clapperId);
  if (error) return { error: "No se pudo borrar." };
  revalidateTag("album", "max");
  revalidatePath("/admin/clappers");
  return { ok: true };
}

// ── Admin: ejecutar el sorteo ponderado por puntos ──────────────────────────
export async function ejecutarSorteo(): Promise<
  FormState & { ganador?: string; total?: number }
> {
  const supabase = await createClient();
  const { data: ranking } = await supabase
    .from("v_ranking")
    .select("clapper_id, nombre, puntos")
    .gt("puntos", 0);

  if (!ranking || ranking.length === 0)
    return { error: "Todavía no hay puntos para sortear." };

  const total = ranking.reduce((s, r) => s + r.puntos, 0);
  const seed = Math.random().toString(36).slice(2);
  let tiro = Math.random() * total;
  let ganador = ranking[ranking.length - 1];
  for (const r of ranking) {
    tiro -= r.puntos;
    if (tiro <= 0) {
      ganador = r;
      break;
    }
  }

  const { error } = await supabase.from("sorteos").insert({
    ganador_clapper_id: ganador.clapper_id,
    ganador_nombre: ganador.nombre,
    seed,
    total_puntos: total,
    snapshot: ranking,
  });
  if (error) return { error: "No se pudo guardar el sorteo." };

  revalidatePath("/admin/sorteo");
  return { ok: true, ganador: ganador.nombre, total };
}
