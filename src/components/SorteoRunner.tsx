"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ejecutarSorteo } from "@/lib/actions";
import type { RankingRow } from "@/lib/types";

export default function SorteoRunner({ ranking }: { ranking: RankingRow[] }) {
  const router = useRouter();
  const [flash, setFlash] = useState<string | null>(null);
  const [ganador, setGanador] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Tickets" ponderados por puntos para que el parpadeo se sienta justo
  const tickets = ranking.flatMap((r) =>
    Array.from({ length: Math.max(1, r.puntos) }, () => r.nombre),
  );
  const pick = () => tickets[Math.floor(Math.random() * tickets.length)];

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function sortear() {
    if (running || tickets.length === 0) return;
    setError(null);
    setGanador(null);
    setRunning(true);

    // Parpadeo que arranca rápido (constante) durante la "tirada"
    let delay = 60;
    const spin = () => {
      setFlash(pick());
      timer.current = setTimeout(spin, delay);
    };
    spin();

    const [res] = await Promise.all([
      ejecutarSorteo(),
      new Promise((r) => setTimeout(r, 2200)),
    ]);

    if (timer.current) clearTimeout(timer.current);

    if (res.error || !res.ganador) {
      setRunning(false);
      setError(res.error ?? "No se pudo sortear.");
      setFlash(null);
      return;
    }

    // Desaceleración final: el parpadeo se frena de a poco y termina en el ganador
    const winner = res.ganador;
    const tail = 10;
    let i = 0;
    const decel = () => {
      i += 1;
      delay = Math.round(60 + i * i * 4); // crece cuadráticamente → frena suave
      if (i >= tail) {
        setFlash(winner);
        setGanador(winner);
        setRunning(false);
        router.refresh();
        return;
      }
      setFlash(i >= tail - 2 ? winner : pick());
      timer.current = setTimeout(decel, delay);
    };
    decel();
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
      {/* Halo de fondo cuando hay ganador */}
      {ganador && (
        <div className="pointer-events-none absolute inset-0 bg-green-bg animate-pulse" />
      )}

      {/* Confeti simple */}
      {ganador && (
        <div className="pointer-events-none absolute inset-0">
          {["🎉", "✨", "🏆", "🎊", "⭐", "🎉", "✨", "🎊"].map((e, idx) => (
            <span
              key={idx}
              className="absolute text-2xl animate-ping"
              style={{
                left: `${8 + idx * 11}%`,
                top: `${idx % 2 === 0 ? 10 : 60}%`,
                animationDelay: `${idx * 0.12}s`,
                animationDuration: "1.2s",
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="text-xs uppercase tracking-widest text-muted mb-3">
          {ganador ? "Ganador" : running ? "Sorteando…" : "Listo para sortear"}
        </div>

        <div
          className={`mx-auto max-w-sm rounded-xl border px-6 py-5 transition-all duration-300 ${
            ganador
              ? "border-green bg-green-bg scale-105 shadow-[0_0_40px_rgba(39,225,193,0.35)]"
              : running
                ? "border-border bg-card-2 scale-100"
                : "border-dashed border-border"
          }`}
        >
          <span
            className={`font-display font-bold leading-tight block ${
              ganador
                ? "text-green text-4xl"
                : running
                  ? "text-foreground text-3xl blur-[0.3px]"
                  : "text-muted text-3xl"
            }`}
          >
            {flash ?? "—"}
          </span>
        </div>

        {ganador && (
          <p className="text-sm text-muted mt-3">
            🏆 ¡Se lleva el álbum del Mundial!
          </p>
        )}
        {error && <p className="text-sm text-orange mt-3">{error}</p>}

        <button
          onClick={sortear}
          disabled={running || tickets.length === 0}
          className="mt-5 px-6 py-3 rounded-full bg-green text-black font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {running
            ? "Girando…"
            : ganador
              ? "Sortear de nuevo"
              : "Sortear ahora"}
        </button>
      </div>
    </div>
  );
}
