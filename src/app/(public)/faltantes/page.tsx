import CopiarBtn from "@/components/CopiarBtn";
import { getFaltantes } from "@/lib/data";

export default async function FaltantesPage() {
  const faltantes = await getFaltantes();

  // Agrupar por selección (manteniendo el orden de código)
  const grupos = new Map<string, { color: string | null; codigos: string[] }>();
  for (const f of faltantes) {
    const nombre = f.selecciones?.nombre ?? "Sin selección";
    if (!grupos.has(nombre))
      grupos.set(nombre, { color: f.selecciones?.color ?? null, codigos: [] });
    grupos.get(nombre)!.codigos.push(f.codigo);
  }
  const lista = [...grupos.entries()];

  // Texto plano para compartir / copiar
  const texto =
    `Faltantes del álbum de Winclap (${faltantes.length}):\n\n` +
    lista
      .map(([nombre, g]) => `${nombre}: ${g.codigos.join(", ")}`)
      .join("\n");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Faltantes de Winclap</h1>
          <p className="text-muted text-sm">
            Lo que todavía falta para completar el álbum. Compartila para conseguir
            cambios afuera. {faltantes.length} figurita
            {faltantes.length !== 1 ? "s" : ""}.
          </p>
        </div>
        {faltantes.length > 0 && <CopiarBtn texto={texto} />}
      </div>

      {faltantes.length === 0 ? (
        <p className="text-muted rounded-lg border border-dashed border-border px-3 py-6 text-center">
          ¡No falta ninguna! El álbum está completo. 🎉
        </p>
      ) : (
        <div className="space-y-4">
          {lista.map(([nombre, g]) => (
            <div
              key={nombre}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: g.color ?? "#1CC9B9" }}
                />
                <h2 className="font-semibold">{nombre}</h2>
                <span className="text-xs text-muted">
                  ({g.codigos.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.codigos.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-xs font-bold px-2 py-1 rounded-lg border border-dashed border-border text-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
