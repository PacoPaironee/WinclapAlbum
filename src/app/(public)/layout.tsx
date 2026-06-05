import SiteNav from "@/components/SiteNav";
import { getIdentity } from "@/lib/data";
import { isAdminEmail } from "@/lib/auth";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getIdentity();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav
        email={identity?.email ?? null}
        nombre={identity?.nombre ?? null}
        puntos={identity?.puntos ?? 0}
        isAdmin={isAdminEmail(identity?.email)}
      />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Álbum del Mundial · hecho en la oficina de{" "}
        <span className="font-display font-bold text-foreground">winclap</span>
      </footer>
    </div>
  );
}
