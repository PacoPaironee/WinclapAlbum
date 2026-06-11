import { getRanking, getFeed, getLogros } from "@/lib/data";
import { categoriaFigu } from "@/lib/points";

const medallas = ["🥇", "🥈", "🥉"];

export default async function RankingPage() {
  const [ranking, feed, logros] = await Promise.all([
    getRanking(),
    getFeed(20),
    getLogros(),
  ]);
  const conPuntos = ranking.filter((r) => r.puntos > 0);
  const maxPuntos = conPuntos[0]?.puntos ?? 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Ranking & chances</h1>
        <p className="text-muted text-sm">
          Los puntos son las probabilidades del sorteo: el doble de puntos es el
          doble de chances de ganar el álbum.
        </p>
      </div>

      {logros.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-3">Logros</h2>
          <div className="grid grid-cols-2 gap-3">
            {logros.map((l) => (
              <div
                key={l.clave}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl shrink-0">{l.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{l.titulo}</div>
                    <div className="text-[11px] text-muted truncate">
                      {l.descripcion}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-green truncate">
                    {l.clapper_nombre}
                  </span>
                  <span className="text-xs text-muted shrink-0">×{l.valor}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {conPuntos.length === 0 ? (
        <p className="text-muted">Todavía nadie sumó puntos.</p>
      ) : (
        <ol className="space-y-2">
          {conPuntos.map((r, i) => (
            <li
              key={r.clapper_id}
              className="rounded-xl border border-border p-4 flex items-center gap-4"
            >
              <span className="font-display font-bold text-xl w-8 text-center">
                {medallas[i] ?? i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold truncate">{r.nombre}</span>
                  <span className="text-sm text-muted">{r.aportes} aportes</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-green-bg overflow-hidden">
                  <div
                    className="h-full bg-green rounded-full"
                    style={{ width: `${(r.puntos / maxPuntos) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-lg">{r.puntos}</div>
                <div className="text-xs text-green font-bold">{r.probabilidad}%</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {feed.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-3">Actividad reciente</h2>
          <ul className="space-y-1.5 text-sm">
            {feed.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-muted">
                <span className="text-green font-bold w-10 shrink-0">
                  +{a.puntos}
                </span>
                <span className="font-semibold text-foreground shrink-0">
                  {a.clappers?.nombre}
                </span>
                <span className="min-w-0 truncate">
                  · {a.tipo} · {a.figuritas?.codigo}
                  {(() => {
                    const cat = categoriaFigu(
                      a.figuritas?.codigo ?? "",
                      a.figuritas?.es_especial,
                      a.figuritas?.es_formacion,
                    );
                    return cat ? ` · ${cat.label.toLowerCase()}` : "";
                  })()}
                  {a.puntos_extra > 0 ? ` · +${a.puntos_extra} extra` : ""}
                  {a.puntos_bonus > 0 ? ` · 🎯 +${a.puntos_bonus} selección` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
