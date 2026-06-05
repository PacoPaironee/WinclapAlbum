"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarAportePropio } from "@/lib/actions";

export default function CancelarAporteBtn({ aporteId }: { aporteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  function cancelar() {
    setError(null);
    start(async () => {
      const res = await cancelarAportePropio(aporteId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-muted hover:bg-orange-bg hover:text-orange transition"
      >
        Cancelar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="text-[11px] text-orange">{error}</span>}
      <button
        type="button"
        onClick={() => setConfirm(false)}
        disabled={pending}
        className="text-xs px-2 py-1 rounded-lg border border-border text-muted disabled:opacity-50"
      >
        No
      </button>
      <button
        type="button"
        onClick={cancelar}
        disabled={pending}
        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange text-white disabled:opacity-50"
      >
        {pending ? "…" : "Sí, cancelar"}
      </button>
    </div>
  );
}
