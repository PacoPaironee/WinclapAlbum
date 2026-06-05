import SorteoRunner from "@/components/SorteoRunner";
import BonusLogrosBtn from "@/components/BonusLogrosBtn";
import { getRanking, getUltimoSorteo, getProgreso } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function AdminSorteoPage() {
  const [ranking, ultimo, progreso] = await Promise.all([
    getRanking(),
    getUltimoSorteo(),
    getProgreso(),
  ]);
  const conPuntos = ranking.filter((r) => r.puntos > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Sorteo</h1>
        <p className="text-muted text-sm">
          Ponderado por puntos: cada punto es un ticket. Más puntos, más chances.
        </p>
      </div>

      {conPuntos.length === 0 ? (
        <p className="text-muted">Todavía no hay puntos validados para sortear.</p>
      ) : (
        <SorteoRunner ranking={conPuntos} />
      )}

      <BonusLogrosBtn faltantes={progreso.faltantes} />

      {ultimo && (
        <div className="rounded-xl bg-green-bg p-4 text-sm">
          Último sorteo: ganó <b>{ultimo.ganador_nombre}</b> ·{" "}
          {formatDate(ultimo.ejecutado_at)} · sobre {ultimo.total_puntos} puntos
          (seed <code>{ultimo.seed}</code>)
        </div>
      )}

      {conPuntos.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2 text-sm text-muted">
            Chances actuales
          </h2>
          <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
            {conPuntos.map((r) => (
              <li
                key={r.clapper_id}
                className="flex justify-between border border-border rounded-lg px-3 py-1.5"
              >
                <span>{r.nombre}</span>
                <span className="font-bold">
                  {r.puntos} pts · {r.probabilidad}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
