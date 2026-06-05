import FormAporte from "@/components/FormAporte";
import { getFiguritas, getIdentity } from "@/lib/data";

export default async function AportarPage() {
  const [figuritas, identity] = await Promise.all([
    getFiguritas({}),
    getIdentity(),
  ]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Cargar aportes</h1>
        <p className="text-muted text-sm">
          Buscá y agregá todas las figuritas que traés. Quedan pendientes hasta
          que el admin las valide y recién ahí se acreditan tus puntos.
        </p>
      </div>
      <FormAporte figuritas={figuritas} userNombre={identity?.nombre ?? "vos"} />
    </div>
  );
}
