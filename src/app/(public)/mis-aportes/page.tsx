import CancelarAporteBtn from "@/components/CancelarAporteBtn";
import {
  AporteEstadoBadge,
  TipoBadge,
  EspecialBadge,
} from "@/components/EstadoBadge";
import { getIdentity, getClapperAportes, getClapperAjustes } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function MisAportesPage() {
  const identity = await getIdentity();
  const [aportes, ajustes] = identity?.clapperId
    ? await Promise.all([
        getClapperAportes(identity.clapperId),
        getClapperAjustes(identity.clapperId),
      ])
    : [[], []];

  const validados = aportes
    .filter((a) => a.estado === "validado")
    .reduce((s, a) => s + (a.puntos ?? 0), 0);
  const pendientes = aportes.filter((a) => a.estado === "pendiente").length;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Mis aportes</h1>
        <p className="text-muted text-sm">
          Tus aportes y su estado, {identity?.nombre ?? "vos"}. Podés cancelar
          los que sigan pendientes.
        </p>
      </div>

      {aportes.length === 0 && ajustes.length === 0 ? (
        <p className="text-muted rounded-lg border border-dashed border-border px-3 py-6 text-center">
          No tenés aportes cargados todavía.{" "}
          <a href="/aportar" className="text-green font-semibold">
            Cargá el primero
          </a>
          .
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-display text-2xl font-bold text-green">
                {validados}
              </div>
              <div className="text-xs text-muted">puntos validados</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-display text-2xl font-bold text-yellow">
                {pendientes}
              </div>
              <div className="text-xs text-muted">pendientes</div>
            </div>
          </div>

          {ajustes.length > 0 && (
            <div className="rounded-xl border border-purple/40 bg-purple-bg p-4">
              <h2 className="font-display font-bold mb-2 flex items-center gap-2">
                ⭐ Puntos del admin
              </h2>
              <ul className="space-y-1.5">
                {ajustes.map((aj) => (
                  <li key={aj.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`font-display font-bold shrink-0 w-12 ${
                        aj.puntos >= 0 ? "text-green" : "text-orange"
                      }`}
                    >
                      {aj.puntos >= 0 ? `+${aj.puntos}` : aj.puntos}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-foreground">
                        {aj.motivo ?? "Ajuste de puntos"}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {formatDate(aj.created_at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="space-y-2">
            {aportes.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted">
                    {a.figuritas?.codigo}
                  </span>
                  <span className="text-sm font-semibold flex-1 min-w-0 truncate">
                    {a.figuritas?.selecciones?.nombre ?? "—"}
                  </span>
                  <TipoBadge tipo={a.tipo} />
                  {a.figuritas?.es_especial && <EspecialBadge />}
                  <AporteEstadoBadge estado={a.estado} />
                </div>

                {a.tipo === "cambio" && a.cambio_fig?.codigo && (
                  <div className="text-xs text-muted mt-1">
                    Cambio: entra {a.figuritas?.codigo} ↔ se va{" "}
                    {a.cambio_fig.codigo}
                  </div>
                )}
                {a.comentario && (
                  <div className="text-xs text-muted italic mt-1">
                    “{a.comentario}”
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted">
                    {formatDate(a.created_at)}
                    {a.estado === "validado" ? ` · +${a.puntos} pts` : ""}
                    {a.estado === "validado" && a.puntos_extra > 0
                      ? ` (+${a.puntos_extra} extra)`
                      : ""}
                    {a.estado === "validado" && a.puntos_bonus > 0
                      ? ` (🎯 +${a.puntos_bonus} selección)`
                      : ""}
                  </span>
                  {a.estado === "pendiente" && (
                    <CancelarAporteBtn aporteId={a.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
