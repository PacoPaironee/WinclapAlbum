export type TipoAporte = "repe" | "cambio" | "nueva";
export type EstadoAporte = "pendiente" | "validado" | "rechazado";
export type EstadoFigurita = "faltante" | "pegada";

export interface Seleccion {
  id: string;
  nombre: string;
  grupo: string | null;
  orden: number;
  color: string;
}

export interface Figurita {
  id: string;
  codigo: string;
  nombre: string | null;
  seleccion_id: string | null;
  es_coca: boolean;
  es_especial: boolean;
  es_formacion: boolean;
  estado: EstadoFigurita;
  repetidas: number;
  repetidas_reservadas: number;
  reservada: boolean;
  fecha_pegada: string | null;
}

export interface Clapper {
  id: string;
  nombre: string;
  email: string | null;
}

export interface Aporte {
  id: string;
  clapper_id: string;
  figurita_id: string;
  tipo: TipoAporte;
  es_coca: boolean;
  puntos: number;
  puntos_extra: number;
  puntos_bonus: number;
  completo_seleccion: boolean;
  faltantes_snapshot: number | null;
  estado: EstadoAporte;
  cambio_figurita_id: string | null;
  comentario: string | null;
  created_at: string;
  validado_at: string | null;
}

export interface Progreso {
  total: number;
  pegadas: number;
  faltantes: number;
  repetidas: number;
  porcentaje: number;
}

export interface ProgresoSeleccion {
  seleccion_id: string;
  nombre: string;
  grupo: string | null;
  orden: number;
  color: string;
  total: number;
  pegadas: number;
  faltantes: number;
  repetidas: number;
}

export interface RankingRow {
  clapper_id: string;
  nombre: string;
  puntos: number;
  aportes: number;
  probabilidad: number;
}

export interface Logro {
  clave: string;
  titulo: string;
  descripcion: string;
  emoji: string;
  clapper_id: string;
  clapper_nombre: string;
  valor: number;
}

export interface Sorteo {
  id: string;
  ganador_clapper_id: string | null;
  ganador_nombre: string | null;
  seed: string | null;
  total_puntos: number | null;
  ejecutado_at: string;
}
