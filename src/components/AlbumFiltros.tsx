"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Seleccion } from "@/lib/types";

const estados = [
  { value: "", label: "Todas" },
  { value: "faltante", label: "Faltantes" },
  { value: "pegada", label: "Pegadas" },
  { value: "repe", label: "Con repes" },
  { value: "especial", label: "Especiales (5)" },
  { value: "formacion", label: "Formación/escudo (4)" },
];

export default function AlbumFiltros({
  selecciones,
}: {
  selecciones: Seleccion[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const seleccion = params.get("seleccion") ?? "";
  const estado = params.get("estado") ?? "";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/album?${next.toString()}`);
  }

  const selectClass =
    "px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold focus:border-green focus:ring-2 focus:ring-green-bg outline-none";

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={seleccion}
        onChange={(e) => update("seleccion", e.target.value)}
        className={selectClass}
      >
        <option value="">Todas las selecciones</option>
        {selecciones.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
      <select
        value={estado}
        onChange={(e) => update("estado", e.target.value)}
        className={selectClass}
      >
        {estados.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  );
}
