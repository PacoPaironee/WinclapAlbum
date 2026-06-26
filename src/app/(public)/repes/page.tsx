import FiguritaCard from "@/components/FiguritaCard";
import CopiarBtn from "@/components/CopiarBtn";
import { getRepes, compareFiguritas, type FiguritaConSeleccion } from "@/lib/data";

export default async function RepesPage() {
  const repes = [...(await getRepes())].sort(compareFiguritas);
  const totalRepes = repes.reduce((s, f) => s + f.repetidas, 0);

  // Agrupar por selección (en orden natural)
  const grupos = new Map<
    string,
    { color: string | null; figus: FiguritaConSeleccion[] }
  >();
  for (const f of repes) {
    const nombre = f.selecciones?.nombre ?? "Sin selección";
    if (!grupos.has(nombre))
      grupos.set(nombre, { color: f.selecciones?.color ?? null, figus: [] });
    grupos.get(nombre)!.figus.push(f);
  }
  const lista = [...grupos.entries()];

  // Texto plano para compartir / copiar
  const texto =
    `Repetidas de Winclap (${totalRepes}):\n\n` +
    lista
      .map(
        ([nombre, g]) =>
          `${nombre}: ${g.figus
            .map((f) => `${f.codigo}${f.repetidas > 1 ? ` x${f.repetidas}` : ""}`)
            .join(", ")}`,
      )
      .join("\n");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Mazo de repetidas</h1>
          <p className="text-muted text-sm">
            Las que Winclap tiene de más, para cambiar. {totalRepes} repetida
            {totalRepes !== 1 ? "s" : ""} en total.
          </p>
        </div>
        {repes.length > 0 && <CopiarBtn texto={texto} />}
      </div>

      {repes.length === 0 ? (
        <p className="text-muted rounded-lg border border-dashed border-border px-3 py-6 text-center">
          Todavía no hay repetidas cargadas.
        </p>
      ) : (
        <div className="space-y-5">
          {lista.map(([nombre, g]) => (
            <div key={nombre}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: g.color ?? "#1CC9B9" }}
                />
                <h2 className="font-semibold">{nombre}</h2>
                <span className="text-xs text-muted">({g.figus.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {g.figus.map((f) => (
                  <FiguritaCard key={f.id} fig={f} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
