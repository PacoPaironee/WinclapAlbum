"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { otorgarBonusLogros } from "@/lib/actions";

export default function BonusLogrosBtn({
  faltantes,
}: {
  faltantes: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completo = faltantes === 0;

  function otorgar() {
    setError(null);
    setMsg(null);
    start(async () => {
      const res = await otorgarBonusLogros();
      if (res?.error) setError(res.error);
      else {
        setMsg(res.message ?? "Listo.");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h2 className="font-display text-lg font-bold mb-1">Bonus de logros</h2>
      <p className="text-sm text-muted mb-3">
        Cuando el álbum esté completo, cada ganador de logro suma{" "}
        <b className="text-yellow">+50 puntos</b>. Se puede otorgar una sola vez.
      </p>
      <button
        onClick={otorgar}
        disabled={pending || !completo}
        className="px-5 py-2.5 rounded-full bg-yellow text-black font-bold hover:opacity-90 transition disabled:opacity-40"
      >
        {pending
          ? "Otorgando…"
          : completo
            ? "Otorgar +50 a los ganadores de logros"
            : `Faltan ${faltantes} figuritas para habilitar`}
      </button>
      {msg && <p className="text-sm text-green mt-2">{msg}</p>}
      {error && <p className="text-sm text-orange mt-2">{error}</p>}
    </div>
  );
}
