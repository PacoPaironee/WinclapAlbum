"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Validar" },
  { href: "/admin/figuritas", label: "Figuritas" },
  { href: "/admin/clappers", label: "Clappers" },
  { href: "/admin/sorteo", label: "Sorteo" },
];

export default function AdminNav() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border text-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/winclap-logo.svg"
            alt="Winclap"
            width={73}
            height={16}
            className="h-4 w-[73px] shrink-0"
          />
          <span className="text-xs text-green border-l border-border pl-2">
            admin
          </span>
        </span>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                path === l.href
                  ? "bg-green text-black"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            className="px-3 py-1.5 text-sm text-white/50 hover:text-white"
          >
            Ver sitio
          </Link>
          <button
            onClick={logout}
            className="ml-1 px-3 py-1.5 rounded-full text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}
