// Badges reutilizables de estado (figuritas y aportes). Server-safe.

const pill =
  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap";

const tipoLabel: Record<string, string> = {
  repe: "Repe",
  cambio: "Cambio",
  nueva: "Nueva",
};

// Estado de un aporte: pendiente / validado / rechazado
export function AporteEstadoBadge({ estado }: { estado: string }) {
  if (estado === "validado")
    return <span className={`${pill} bg-green-bg text-green`}>✓ Validado</span>;
  if (estado === "rechazado")
    return (
      <span className={`${pill} bg-card-2 text-muted`}>✕ Rechazado</span>
    );
  return (
    <span className={`${pill} bg-yellow/15 text-yellow`}>⏳ Pendiente</span>
  );
}

// Tipo de aporte
export function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`${pill} bg-green-bg text-green`}>
      {tipoLabel[tipo] ?? tipo}
    </span>
  );
}

// Estado de una figurita en el álbum
export function FiguritaEstadoBadge({
  estado,
  reservada = false,
}: {
  estado: string;
  reservada?: boolean;
}) {
  if (estado === "pegada")
    return <span className={`${pill} bg-green-bg text-green`}>Pegada</span>;
  if (reservada)
    return <span className={`${pill} bg-purple-bg text-purple`}>Reservada</span>;
  return <span className={`${pill} bg-card-2 text-muted`}>Falta</span>;
}

// Repes: disponibles vs reservadas
export function RepeBadge({
  repetidas,
  reservadas = 0,
}: {
  repetidas: number;
  reservadas?: number;
}) {
  const disp = Math.max(repetidas - reservadas, 0);
  return (
    <span className={`${pill} bg-blue-bg text-blue`}>
      Repe ×{repetidas}
      {reservadas > 0 ? ` · ${disp} libre${disp === 1 ? "" : "s"}` : ""}
    </span>
  );
}

export function CocaBadge() {
  return (
    <span className={`${pill} bg-orange text-white`}>COCA ×2</span>
  );
}

export function EspecialBadge() {
  return (
    <span className={`${pill} bg-yellow/15 text-yellow`}>★ Especial</span>
  );
}
