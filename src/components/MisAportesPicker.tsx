"use client";

import { useRouter } from "next/navigation";
import type { Clapper } from "@/lib/types";

export default function MisAportesPicker({
  clappers,
  value,
}: {
  clappers: Clapper[];
  value: string;
}) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => {
        const id = e.target.value;
        router.push(id ? `/mis-aportes?clapper=${id}` : "/mis-aportes");
      }}
      className="w-full px-4 py-3 rounded-lg border border-border bg-card text-base font-semibold focus:border-green focus:ring-2 focus:ring-green-bg outline-none"
    >
      <option value="">Elegí tu nombre…</option>
      {clappers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
      ))}
    </select>
  );
}
