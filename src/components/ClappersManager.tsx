"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearClapper,
  borrarClapper,
  ajustarPuntos,
  type FormState,
} from "@/lib/actions";
import type { Clapper } from "@/lib/types";

export default function ClappersManager({
  clappers,
  puntos = {},
}: {
  clappers: Clapper[];
  puntos?: Record<string, number>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    crearClapper,
    {},
  );
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={(fd) => {
          formAction(fd);
        }}
        className="flex flex-wrap gap-2 items-end"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold mb-1">Nombre</label>
          <input
            name="nombre"
            required
            className="w-full px-3 py-2 rounded-lg border border-border focus:border-green outline-none"
            placeholder="Nombre y apellido"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold mb-1">Email (opc.)</label>
          <input
            name="email"
            type="email"
            className="w-full px-3 py-2 rounded-lg border border-border focus:border-green outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-green text-black font-bold disabled:opacity-50"
        >
          Agregar
        </button>
      </form>
      {state.error && <p className="text-sm text-orange">{state.error}</p>}

      <ul className="divide-y divide-border border border-border rounded-xl">
        {clappers.length === 0 && (
          <li className="p-4 text-muted text-sm">Todavía no hay clappers.</li>
        )}
        {clappers.map((c) => (
          <li
            key={c.id}
            className="p-3 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{c.nombre}</div>
              {c.email && (
                <div className="text-xs text-muted truncate">{c.email}</div>
              )}
            </div>
            <span className="font-display font-bold text-green shrink-0">
              {puntos[c.id] ?? 0} pts
            </span>
            <AjustePuntos clapperId={c.id} />
            <button
              onClick={() =>
                startDelete(async () => {
                  await borrarClapper(c.id);
                  router.refresh();
                })
              }
              disabled={deleting}
              className="text-sm text-muted hover:text-orange disabled:opacity-50 shrink-0"
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AjustePuntos({ clapperId }: { clapperId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function aplicar() {
    const n = parseInt(valor, 10);
    if (!Number.isFinite(n) || n === 0) {
      setError("≠ 0");
      return;
    }
    setError(null);
    start(async () => {
      const res = await ajustarPuntos(clapperId, n, motivo);
      if (res?.error) setError(res.error);
      else {
        setValor("");
        setMotivo("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input
        type="number"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="±pts"
        title="Puntos a sumar (o negativo para restar)"
        className="w-16 px-2 py-1 rounded-lg border border-border bg-card-2 text-sm text-center outline-none focus:border-green"
      />
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="motivo (opc.)"
        className="hidden md:block w-32 px-2 py-1 rounded-lg border border-border bg-card-2 text-sm outline-none focus:border-green"
      />
      <button
        onClick={aplicar}
        disabled={pending}
        className="px-2.5 py-1 rounded-lg text-sm font-bold bg-green/15 text-green hover:bg-green/25 disabled:opacity-50"
      >
        {pending ? "…" : "Aplicar"}
      </button>
      {error && <span className="text-[11px] text-orange">{error}</span>}
    </div>
  );
}
