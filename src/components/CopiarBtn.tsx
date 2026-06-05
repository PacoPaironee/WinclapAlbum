"use client";

import { useState } from "react";

export default function CopiarBtn({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // noop
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="shrink-0 px-4 py-2 rounded-full text-sm font-bold bg-green text-black hover:opacity-90 transition"
    >
      {copiado ? "¡Copiado! ✓" : "Copiar lista"}
    </button>
  );
}
