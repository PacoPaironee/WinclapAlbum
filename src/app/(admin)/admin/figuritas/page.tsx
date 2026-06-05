import Link from "next/link";
import FiguritaAdminRow from "@/components/FiguritaAdminRow";
import {
  getFiguritas,
  getProgresoSelecciones,
} from "@/lib/data";

export default async function AdminFiguritasPage({
  searchParams,
}: {
  searchParams: Promise<{ seleccion?: string }>;
}) {
  const { seleccion } = await searchParams;

  if (!seleccion) {
    const selecciones = await getProgresoSelecciones();
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Figuritas</h1>
          <p className="text-muted text-sm">
            Elegí una selección para marcar pegadas y cargar repetidas.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {selecciones.map((s) => (
            <Link
              key={s.seleccion_id}
              href={`/admin/figuritas?seleccion=${s.seleccion_id}`}
              className="rounded-xl border border-border p-4 hover:border-green transition"
            >
              <div className="font-semibold">{s.nombre}</div>
              <div className="text-sm text-muted">
                {s.pegadas}/{s.total} · {s.faltantes} faltan
              </div>
              {s.repetidas > 0 && (
                <div className="text-xs text-orange font-semibold">
                  {s.repetidas} repes
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const figuritas = await getFiguritas({ seleccion });
  const nombre = figuritas[0]?.selecciones?.nombre ?? "Selección";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/figuritas"
          className="text-sm font-semibold text-green"
        >
          ← Volver
        </Link>
        <h1 className="font-display text-2xl font-bold">{nombre}</h1>
      </div>
      <div className="space-y-2">
        {figuritas.map((f) => (
          <FiguritaAdminRow key={f.id} fig={f} />
        ))}
      </div>
    </div>
  );
}
