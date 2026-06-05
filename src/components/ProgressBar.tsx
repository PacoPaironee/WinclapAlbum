export default function ProgressBar({
  pegadas,
  total,
  porcentaje,
  size = "md",
}: {
  pegadas: number;
  total: number;
  porcentaje: number;
  size?: "sm" | "md";
}) {
  const pct = Math.min(100, Math.max(0, porcentaje));
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className={`font-semibold ${size === "md" ? "text-sm" : "text-xs"} text-muted`}
        >
          {pegadas} de {total} pegadas
        </span>
        <span
          className={`font-display font-bold ${size === "md" ? "text-lg" : "text-sm"}`}
        >
          {pct}%
        </span>
      </div>
      <div
        className={`w-full ${size === "md" ? "h-3" : "h-2"} rounded-full bg-green-bg overflow-hidden`}
      >
        <div
          className="h-full rounded-full bg-green transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
