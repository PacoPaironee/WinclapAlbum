import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { getProgreso, getRanking, getFeed } from "@/lib/data";
import { VALOR_FIGURITA } from "@/lib/points";

const tipoLabel: Record<string, string> = {
  repe: "repe",
  cambio: "cambio",
  nueva: "nueva",
};

export default async function HomePage() {
  const [progreso, ranking, feed] = await Promise.all([
    getProgreso(),
    getRanking(),
    getFeed(8),
  ]);
  const top = ranking.filter((r) => r.puntos > 0).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-card border border-border text-white p-8 sm:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-green/20 blur-3xl" />
        <p className="relative text-green font-semibold uppercase tracking-widest text-xs mb-3">
          Álbum del Mundial · Winclap
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-4">
          Lo llenamos entre todos.
          <br />
          Después lo sorteamos.
        </h1>
        <p className="text-white/70 max-w-xl mb-6">
          Cada figurita que traés suma puntos, y los puntos son tus chances en el
          sorteo final del álbum. Mientras más ayudás, más probabilidades tenés.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/aportar"
            className="px-5 py-2.5 rounded-full bg-green text-black font-bold hover:bg-white transition"
          >
            Sumar una figurita
          </Link>
          <Link
            href="/album"
            className="px-5 py-2.5 rounded-full border border-white/30 font-bold hover:bg-white/10 transition"
          >
            Ver el álbum
          </Link>
        </div>
      </section>

      {/* Progreso */}
      <section className="rounded-2xl border border-border p-6">
        <h2 className="font-display text-xl font-bold mb-4">Cómo viene el álbum</h2>
        <ProgressBar
          pegadas={progreso.pegadas}
          total={progreso.total}
          porcentaje={progreso.porcentaje}
        />
        <div className="grid grid-cols-3 gap-3 mt-5 text-center">
          <Stat label="Pegadas" value={progreso.pegadas} color="text-green" />
          <Stat label="Faltan" value={progreso.faltantes} color="text-orange" />
          <Stat label="Repes" value={progreso.repetidas} color="text-foreground" />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top ranking */}
        <section className="rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Top aportadores</h2>
            <Link href="/ranking" className="text-sm font-semibold text-green">
              Ver todo →
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="text-sm text-muted">Todavía nadie sumó puntos. ¡Arrancá vos!</p>
          ) : (
            <ol className="space-y-3">
              {top.map((r, i) => (
                <li key={r.clapper_id} className="flex items-center gap-3">
                  <span className="font-display font-bold text-lg w-6">
                    {["🥇", "🥈", "🥉"][i]}
                  </span>
                  <span className="flex-1 font-semibold truncate">{r.nombre}</span>
                  <span className="font-bold">{r.puntos} pts</span>
                  <span className="text-xs text-muted w-12 text-right">
                    {r.probabilidad}%
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Cómo se suman puntos */}
        <section className="rounded-2xl border border-border p-6">
          <h2 className="font-display text-xl font-bold mb-4">Cómo se suman puntos</h2>
          <ul className="space-y-2 text-sm">
            <Regla c="bg-green-bg" t="Repe" p="+1" d="Traés una que ya está pegada" />
            <Regla c="bg-blue-bg" t="Cambio" p="+2" d="Llenás un hueco con el mazo" />
            <Regla c="bg-orange-bg" t="Nueva" p="+3" d="Figu propia que faltaba" />
          </ul>
          <p className="text-xs text-muted mt-3">
            Una <b>nueva</b> vale más según la figurita:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {VALOR_FIGURITA.map((v) => (
              <span
                key={v.t}
                className="text-[11px] px-2 py-1 rounded-full bg-green-bg font-semibold"
                title={v.d}
              >
                {v.t}: <b>+{v.p}</b>
              </span>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">
            El admin además puede sumar <b className="text-purple">puntos extra</b> a
            su criterio. Los ganadores de logros suman <b>+50</b> al completar el
            álbum.
          </p>
        </section>
      </div>

      {/* Feed */}
      {feed.length > 0 && (
        <section className="rounded-2xl border border-border p-6">
          <h2 className="font-display text-xl font-bold mb-4">Última actividad</h2>
          <ul className="space-y-2 text-sm">
            {feed.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-muted">
                <span className="text-green font-bold">+{a.puntos}</span>
                <span className="text-foreground font-semibold">
                  {a.clappers?.nombre}
                </span>
                <span>
                  {tipoLabel[a.tipo]} · {a.figuritas?.codigo}
                  {a.figuritas?.selecciones?.nombre
                    ? ` (${a.figuritas.selecciones.nombre})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-green-bg/50 py-3">
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted font-semibold">{label}</div>
    </div>
  );
}

function Regla({
  c,
  t,
  p,
  d,
}: {
  c: string;
  t: string;
  p: string;
  d: string;
}) {
  return (
    <li className={`flex items-center gap-3 rounded-lg ${c} px-3 py-2`}>
      <span className="font-bold w-16">{t}</span>
      <span className="font-display font-bold">{p}</span>
      <span className="text-muted text-xs flex-1 text-right">{d}</span>
    </li>
  );
}
