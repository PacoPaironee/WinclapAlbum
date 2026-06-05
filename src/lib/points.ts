import type { TipoAporte } from "./types";

// Fuente única de verdad del modelo de puntos (espeja calcular_puntos en SQL).
//   repe = 1 · cambio = 2
//   nueva: especial = 5 · formación/escudo = 4 · normal = 3
// Las categorías solo aplican a "nueva" (en cambio siempre vale 2).
export function calcularPuntos(
  tipo: TipoAporte,
  fig: { especial?: boolean; formacion?: boolean } = {},
): number {
  if (tipo === "repe") return 1;
  if (tipo === "cambio") return 2;
  return fig.especial ? 5 : fig.formacion ? 4 : 3;
}

// Para mostrar la tabla de "cómo se suman puntos".
export const VALOR_FIGURITA = [
  { t: "Normal", p: 3, d: "Cualquier figurita común" },
  { t: "Formación / escudo", p: 4, d: "Figuritas 1 y 13 de cada país" },
  { t: "Especial", p: 5, d: "Coca, We Are Panini y FIFA World Cup History" },
];
