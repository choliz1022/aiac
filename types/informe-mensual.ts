export type TipoInforme = "contratista" | "supervision";

export type InformeMensualInput = {
  mes: number;
  anio: number;
  tipoInforme?: TipoInforme;
};

export type InformeMensualEvidencia = {
  id: string;
  actividad_id: string;
  url: string;
  nombre_archivo: string;
  created_at: string;
  signed_url?: string;
};

/** Fila contractual: una actividad registrada con su redacción IA y evidencias. */
export type InformeMensualActividadFila = {
  id: string;
  fecha: string;
  /** Etiqueta de fecha para presentación (individual o consolidada). */
  fecha_ejecucion_etiqueta: string;
  redaccion_ia: string;
  /** Redacciones sin modificar cuando se agrupan actividades equivalentes. */
  redacciones_ia?: string[];
  actividades_origen_ids?: string[];
  evidencias: InformeMensualEvidencia[];
};

export type InformeMensualObligacion = {
  /** Texto completo de la obligación contractual. */
  nombre: string;
  actividades: InformeMensualActividadFila[];
  mensajeSinActividades?: string;
};

export type InformeMensualContrato = {
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  contratista_nombre?: string;
  contrato_fecha_inicio?: string | null;
  contrato_fecha_fin?: string | null;
  supervisor_nombre?: string;
  supervisor_cargo?: string;
};

export type InformeMensualPeriodo = {
  mes: number;
  anio: number;
  etiqueta: string;
};

export type InformeMensualResumen = {
  totalActividades: number;
  totalObligaciones: number;
  totalObligacionesTrabajadas: number;
};

export type InformeMensualData = {
  tipoInforme?: TipoInforme;
  contrato: InformeMensualContrato;
  periodo: InformeMensualPeriodo;
  obligaciones: InformeMensualObligacion[];
  resumen: InformeMensualResumen;
  observacionesFinales?: string;
};

export type GenerarInformeSuccess = {
  success: true;
  informe: InformeMensualData;
};

export type GenerarInformeSinActividades = {
  success: true;
  sinActividades: true;
};

export type GenerarInformeError = {
  success: false;
  error: string;
};

export type GenerarInformeResult =
  | GenerarInformeSuccess
  | GenerarInformeSinActividades
  | GenerarInformeError;

/** Tipos legacy usados por el módulo de consolidación IA (no usados en el informe contractual). */
export type InformeMensualActividadConsolidada = {
  frente: string;
  redaccion_consolidada: string;
  actividades_origen_ids: string[];
  fechas_origen: string[];
  evidencias: InformeMensualEvidencia[];
};

export type ConsolidacionInformeItem = {
  frente: string;
  redaccion_consolidada: string;
  actividades_origen_ids: string[];
};

export type ConsolidacionInformeResult = {
  consolidaciones: ConsolidacionInformeItem[];
};
