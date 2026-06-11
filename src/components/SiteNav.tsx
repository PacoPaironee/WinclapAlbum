"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/album", label: "Álbum" },
  { href: "/repes", label: "Repes" },
  { href: "/faltantes", label: "Faltantes" },
  { href: "/ranking", label: "Ranking" },
  { href: "/mis-aportes", label: "Mis aportes" },
];

export default function SiteNav({
  email,
  nombre,
  puntos = 0,
  isAdmin = false,
}: {
  email?: string | null;
  nombre?: string | null;
  puntos?: number;
  isAdmin?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/winclap-logo.svg"
            alt="Winclap"
            width={91}
            height={20}
            className="h-5 w-[91px] shrink-0"
          />
          <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-[0.15em] text-green border-l border-border pl-2.5 whitespace-nowrap">
            República de Córdoba
          </span>
        </Link>

        <nav className="flex-1 min-w-0 flex items-center justify-start sm:justify-end gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar pl-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-full text-[13px] sm:text-sm font-semibold transition ${
                isActive(l.href)
                  ? "bg-green text-black"
                  : "text-muted hover:text-foreground hover:bg-green-bg"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-full text-[13px] sm:text-sm font-semibold transition ${
                isActive("/admin")
                  ? "bg-green text-black"
                  : "text-purple hover:bg-purple-bg"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/aportar"
            className="px-3 sm:px-4 py-1.5 rounded-full text-[13px] sm:text-sm font-bold bg-green text-black hover:opacity-90 transition"
          >
            Aportar
          </Link>
          {email && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-[13px] font-semibold truncate max-w-[150px]">
                  {nombre || email}
                </div>
                <div className="text-[11px] font-bold text-green">
                  {puntos} {puntos === 1 ? "punto" : "puntos"}
                </div>
              </div>
              <button
                onClick={logout}
                title={`${nombre || email} · Salir`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-xs font-bold text-muted hover:text-foreground hover:border-green transition"
                aria-label={`Salir (${email})`}
              >
                {(nombre || email)[0]?.toUpperCase() ?? "?"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
