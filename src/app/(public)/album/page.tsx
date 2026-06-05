import { Suspense } from "react";
import AlbumFiltros from "@/components/AlbumFiltros";
import FiguritaCard from "@/components/FiguritaCard";
import ProgressBar from "@/components/ProgressBar";
import { getFiguritas, getSelecciones, getProgreso } from "@/lib/data";

export default async function AlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ seleccion?: string; estado?: string }>;
}) {
  const { seleccion, estado } = await searchParams;
  const [selecciones, figuritas, progreso] = await Promise.all([
    getSelecciones(),
    getFiguritas({ seleccion, estado }),
    getProgreso(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Planilla del álbum</h1>
          <p className="text-muted text-sm">
            Filtrá por selección y estado para ver qué falta y qué hay repetido.
          </p>
        </div>
        <div className="sm:w-72">
          <ProgressBar
            pegadas={progreso.pegadas}
            total={progreso.total}
            porcentaje={progreso.porcentaje}
            size="sm"
          />
        </div>
      </div>

      <Suspense>
        <AlbumFiltros selecciones={selecciones} />
      </Suspense>

      <p className="text-sm text-muted font-semibold">
        {figuritas.length} figurita{figuritas.length !== 1 ? "s" : ""}
      </p>

      {figuritas.length === 0 ? (
        <p className="text-muted">No hay figuritas con ese filtro.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {figuritas.map((f) => (
            <FiguritaCard key={f.id} fig={f} />
          ))}
        </div>
      )}
    </div>
  );
}
