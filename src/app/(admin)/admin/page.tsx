import AporteAcciones from "@/components/AporteAcciones";
import { getPendientes, getProgreso } from "@/lib/data";
import { calcularPuntos, categoriaFigu } from "@/lib/points";
import { formatDate } from "@/lib/format";
import type { TipoAporte } from "@/lib/types";

const tipoLabel: Record<string, string> = {
  repe: "Repe",
  cambio: "Cambio",
  nueva: "Nueva",
};

export default async function AdminValidarPage() {
  const [pendientes, progreso] = await Promise.all([
    getPendientes(),
    getProgreso(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Aportes pendientes</h1>
        <p className="text-muted text-sm">
          Validá o rechazá. Al validar se acreditan los puntos y se actualiza el
          álbum. Hoy faltan <b>{progreso.faltantes}</b> figuritas.
        </p>
      </div>

      {pendientes.length === 0 ? (
        <p className="text-muted">No hay aportes pendientes. ✅</p>
      ) : (
        <ul className="space-y-3">
          {pendientes.map((a) => {
            const preview = calcularPuntos(a.tipo as TipoAporte, {
              especial: a.figuritas?.es_especial,
              formacion: a.figuritas?.es_formacion,
            });
            return (
              <li
                key={a.id}
                className="rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{a.clappers?.nombre}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-bg font-semibold">
                      {tipoLabel[a.tipo]}
                    </span>
                    {(() => {
                      const cat = categoriaFigu(
                        a.figuritas?.codigo ?? "",
                        a.figuritas?.es_especial,
                        a.figuritas?.es_formacion,
                      );
                      return cat ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            cat.pts === 5
                              ? "bg-orange text-white"
                              : "bg-yellow/20 text-yellow"
                          }`}
                        >
                          {cat.label} · {cat.pts}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-sm text-muted mt-0.5">
                    {a.figuritas?.codigo}
                    {a.figuritas?.selecciones?.nombre
                      ? ` · ${a.figuritas.selecciones.nombre}`
                      : ""}
                    {a.figuritas?.estado === "pegada" && (
                      <span className="text-orange font-semibold"> · ya pegada</span>
                    )}
                    {" · "}
                    {formatDate(a.created_at)}
                  </div>
                  {a.tipo === "cambio" && (
                    <div className="text-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="rounded-full bg-green-bg px-2 py-0.5 font-semibold text-green">
                        ↓ ingresa al álbum: {a.figuritas?.codigo}
                      </span>
                      <span className="rounded-full bg-orange-bg px-2 py-0.5 font-semibold text-orange">
                        ↑ se lleva la repe:{" "}
                        {a.cambio_fig?.codigo ?? "—"}
                        {a.cambio_fig?.selecciones?.nombre
                          ? ` · ${a.cambio_fig.selecciones.nombre}`
                          : ""}
                      </span>
                    </div>
                  )}
                  {a.comentario && (
                    <div className="text-xs text-muted italic mt-0.5">
                      “{a.comentario}”
                    </div>
                  )}
                </div>
                <AporteAcciones aporteId={a.id} base={preview} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
