import FiguritaCard from "@/components/FiguritaCard";
import { getRepes } from "@/lib/data";

export default async function RepesPage() {
  const repes = await getRepes();
  const totalRepes = repes.reduce((s, f) => s + f.repetidas, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Mazo de repetidas</h1>
        <p className="text-muted text-sm">
          Las que Winclap tiene de más, para cambiar. {totalRepes} repetida
          {totalRepes !== 1 ? "s" : ""} en total.
        </p>
      </div>

      {repes.length === 0 ? (
        <p className="text-muted">Todavía no hay repetidas cargadas.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {repes.map((f) => (
            <FiguritaCard key={f.id} fig={f} />
          ))}
        </div>
      )}
    </div>
  );
}
