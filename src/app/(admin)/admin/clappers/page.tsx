import ClappersManager from "@/components/ClappersManager";
import { getClappers, getRanking } from "@/lib/data";

export default async function AdminClappersPage() {
  const [clappers, ranking] = await Promise.all([getClappers(), getRanking()]);
  const puntos: Record<string, number> = {};
  for (const r of ranking) puntos[r.clapper_id] = r.puntos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Clappers</h1>
        <p className="text-muted text-sm">
          Quiénes participan del álbum. También se crean solos al cargar un
          aporte. Podés sumar o restar puntos a cada uno.
        </p>
      </div>
      <ClappersManager clappers={clappers} puntos={puntos} />
    </div>
  );
}
