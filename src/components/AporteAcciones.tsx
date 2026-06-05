"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { validarAporte, rechazarAporte } from "@/lib/actions";

export default function AporteAcciones({
  aporteId,
  base,
}: {
  aporteId: string;
  base: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState(0);
  const total = base + (Number.isFinite(extra) ? Math.max(0, extra) : 0);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-muted">base +{base}</span>
        <label className="flex items-center gap-1 text-xs text-muted">
          extra
          <input
            type="number"
            min={0}
            value={extra}
            onChange={(e) => setExtra(parseInt(e.target.value || "0", 10))}
            className="w-14 px-2 py-1 rounded-lg border border-border bg-card-2 text-sm text-center outline-none focus:border-green"
          />
        </label>
        <span className="font-display text-xl font-bold text-green">
          ={total}
        </span>
      </div>
      <div className="flex items-center gap-2 justify-end">
        {error && <span className="text-xs text-orange">{error}</span>}
        <button
          onClick={() => run(() => rechazarAporte(aporteId))}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-border hover:bg-orange-bg disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          onClick={() => run(() => validarAporte(aporteId, Math.max(0, extra || 0)))}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green text-black hover:opacity-90 disabled:opacity-50"
        >
          Validar +{total}
        </button>
      </div>
    </div>
  );
}
