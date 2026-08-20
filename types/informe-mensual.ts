export type InformeMensualInput = {
  mes: number;
  anio: number;
};

export type InformeMensualActividadConsolidada = {
  frente: string;
  redaccion_consolidada: string;
  actividades_origen_ids: string[];
  fechas_origen: string[];
};

export type InformeMensualObligacion = {
  nombre: string;
  actividadesConsolidadas: InformeMensualActividadConsolidada[];
  mensajeSinActividades?: string;
};

export type InformeMensualContrato = {
  nombre: string;
  entidad: string;
  objeto_contractual: string;
};

export type InformeMensualPeriodo = {
  mes: number;
  anio: number;
  etiqueta: string;
};

export type InformeMensualResumen = {
  totalActividades: number;
  totalActividadesConsolidadas: number;
  totalObligaciones: number;
  totalObligacionesTrabajadas: number;
  totalProyectos: number;
  proyectosIdentificados: string[];
};

export type InformeMensualData = {
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

export type ConsolidacionInformeItem = {
  frente: string;
  redaccion_consolidada: string;
  actividades_origen_ids: string[];
};

export type ConsolidacionInformeResult = {
  consolidaciones: ConsolidacionInformeItem[];
};
