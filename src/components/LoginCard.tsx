"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_DOMAIN } from "@/lib/auth";

const mensajes: Record<string, string> = {
  domain: `Tenés que entrar con tu cuenta @${ALLOWED_DOMAIN}.`,
  oauth: "No se pudo completar el ingreso. Probá de nuevo.",
};

export default function LoginCard({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(
    error ? (mensajes[error] ?? "No se pudo ingresar.") : null,
  );

  async function entrar() {
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
      },
    });
    if (error) {
      setErr("No se pudo iniciar sesión con Google.");
      setLoading(false);
    }
    // Si no hay error, el browser redirige a Google.
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/winclap-logo.svg"
            alt="Winclap"
            width={127}
            height={28}
            className="h-7 w-[127px]"
          />
          <p className="text-sm text-muted font-medium">
            Álbum del Mundial · solo para Winclap
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 space-y-4">
          <p className="text-sm text-muted text-center">
            Entrá con tu cuenta de Google{" "}
            <b className="text-foreground">@{ALLOWED_DOMAIN}</b> para ver el álbum
            y cargar tus aportes.
          </p>

          {err && (
            <div className="text-sm text-white bg-orange rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button
            onClick={entrar}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:opacity-90 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition"
          >
            <GoogleIcon />
            {loading ? "Redirigiendo…" : "Entrar con Google"}
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
