"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEstadoFigurita, setRepetidas } from "@/lib/actions";
import type { FiguritaConSeleccion } from "@/lib/data";
import { categoriaFigu } from "@/lib/points";

export default function FiguritaAdminRow({ fig }: { fig: FiguritaConSeleccion }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pegada = fig.estado === "pegada";
  const cat = categoriaFigu(fig.codigo, fig.es_especial, fig.es_formacion);

  function act(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-lg border p-3 flex items-center gap-3 ${
        pegada ? "border-green bg-green-bg" : "border-border"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs font-bold">{fig.codigo}</div>
        <div className="text-sm truncate">
          {fig.nombre ?? fig.selecciones?.nombre ?? "—"}
          {cat && (
            <span
              className={`font-bold ${cat.pts === 5 ? "text-orange" : "text-yellow"}`}
            >
              {" "}
              · {cat.label.toLowerCase()} {cat.pts}
            </span>
          )}
        </div>
      </div>

      {/* Repetidas */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => act(() => setRepetidas(fig.id, fig.repetidas - 1))}
          disabled={pending || fig.repetidas === 0}
          className="w-7 h-7 rounded-md border border-border font-bold disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center font-bold text-sm">{fig.repetidas}</span>
        <button
          onClick={() => act(() => setRepetidas(fig.id, fig.repetidas + 1))}
          disabled={pending}
          className="w-7 h-7 rounded-md border border-border font-bold disabled:opacity-30"
        >
          +
        </button>
        <span className="text-[10px] text-muted ml-1 w-8">repes</span>
      </div>

      {/* Pegada / Falta */}
      <button
        onClick={() =>
          act(() => setEstadoFigurita(fig.id, pegada ? "faltante" : "pegada"))
        }
        disabled={pending}
        className={`px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50 ${
          pegada
            ? "bg-green text-black"
            : "border border-border hover:bg-green-bg"
        }`}
      >
        {pegada ? "Pegada ✓" : "Marcar pegada"}
      </button>
    </div>
  );
}
