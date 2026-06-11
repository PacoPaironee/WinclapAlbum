import type { FiguritaConSeleccion } from "@/lib/data";
import { categoriaFigu } from "@/lib/points";

export default function FiguritaCard({ fig }: { fig: FiguritaConSeleccion }) {
  const pegada = fig.estado === "pegada";
  const cat = categoriaFigu(fig.codigo, fig.es_especial, fig.es_formacion);
  return (
    <div
      className={`relative rounded-xl border p-3 flex flex-col gap-1 ${
        pegada
          ? "border-green bg-green-bg"
          : "border-border bg-card border-dashed"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-muted">
          {fig.codigo}
        </span>
        <div className="flex items-center gap-1">
          {cat && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                cat.pts === 5
                  ? "bg-orange text-white"
                  : "bg-yellow/20 text-yellow"
              }`}
            >
              {cat.label} · {cat.pts}
            </span>
          )}
        </div>
      </div>

      <div
        className="text-sm font-semibold truncate"
        style={{ color: fig.selecciones?.color ?? undefined }}
      >
        {fig.selecciones?.nombre ?? "—"}
      </div>
      {fig.nombre && (
        <div className="text-xs text-muted truncate">{fig.nombre}</div>
      )}

      <div className="mt-1 flex items-center justify-between text-xs">
        <span
          className={`font-bold ${pegada ? "text-green" : "text-muted"}`}
        >
          {pegada ? "Pegada" : "Falta"}
        </span>
        {fig.repetidas > 0 &&
          (() => {
            const disp = Math.max(
              fig.repetidas - (fig.repetidas_reservadas ?? 0),
              0,
            );
            const reserv = fig.repetidas_reservadas ?? 0;
            return (
              <span className="font-bold text-orange text-right">
                {fig.repetidas} repe{fig.repetidas > 1 ? "s" : ""}
                {reserv > 0 && (
                  <span className="block text-[10px] font-semibold text-purple">
                    {disp} libre{disp === 1 ? "" : "s"} · {reserv} reservada
                    {reserv === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            );
          })()}
      </div>
    </div>
  );
}
