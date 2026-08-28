import { transformarRedaccionSupervision } from "@/lib/transformar-redaccion-supervision";
import { obtenerRedaccionesActividadInforme } from "@/lib/informe-mensual";
import {
  construirIntroduccionInformeSupervision,
  formatearContratistaMayusculas,
  formatearFechaActividadSupervision,
  formatearFechaContratoSupervision,
  formatearFechaCorteInformeSupervision,
  formatearNumeroInformeSupervision,
  formatearPeriodoInformeSupervision,
} from "@/lib/formatear-informe-supervision";
import type {
  InformeMensualActividadFila,
  InformeMensualData,
  InformeMensualObligacion,
} from "@/types/informe-mensual";

export const TITULO_INFORME_SUPERVISION = "Informe de supervisión";

export type EncabezadoInformeSupervision = {
  numeroInforme: string;
  numeroContrato: string;
  contratista: string;
  inicioContrato: string;
  finContrato: string;
  periodoInforme: string;
  fechaInforme: string;
  objetoContractual: string;
  introduccion: string;
};

function transformarActividadSupervision(
  actividad: InformeMensualActividadFila
): InformeMensualActividadFila {
  return {
    ...actividad,
    redaccion_ia: transformarRedaccionSupervision(actividad.redaccion_ia),
  };
}

function transformarObligacionSupervision(
  obligacion: InformeMensualObligacion
): InformeMensualObligacion {
  return {
    ...obligacion,
    actividades: obligacion.actividades.map(transformarActividadSupervision),
  };
}

export function construirEncabezadoInformeSupervision(
  informe: InformeMensualData
): EncabezadoInformeSupervision {
  const { contrato, periodo } = informe;

  return {
    numeroInforme: formatearNumeroInformeSupervision(periodo.mes),
    numeroContrato: contrato.nombre,
    contratista: contrato.contratista_nombre?.trim() || "________________",
    inicioContrato: formatearFechaContratoSupervision(contrato.contrato_fecha_inicio),
    finContrato: formatearFechaContratoSupervision(contrato.contrato_fecha_fin),
    periodoInforme: formatearPeriodoInformeSupervision(periodo.mes, periodo.anio),
    fechaInforme: formatearFechaCorteInformeSupervision(periodo.mes, periodo.anio),
    objetoContractual: contrato.objeto_contractual,
    introduccion: construirIntroduccionInformeSupervision(
      contrato.contratista_nombre,
      contrato.nombre
    ),
  };
}

/** Misma fila consolidada que el informe contratista; solo redacciones en tercera persona. */
export function obtenerRedaccionesActividadSupervision(
  actividad: InformeMensualActividadFila
): string[] {
  return obtenerRedaccionesActividadInforme(actividad);
}

export function obtenerFechaActividadSupervision(actividad: InformeMensualActividadFila): string {
  return formatearFechaActividadSupervision(actividad.fecha_ejecucion_etiqueta);
}

/**
 * Parte del informe contractual ya consolidado; solo cambia plantilla y redacción verbal.
 */
export function prepararInformeSupervision(informe: InformeMensualData): InformeMensualData {
  return {
    ...informe,
    tipoInforme: "supervision",
    obligaciones: informe.obligaciones.map(transformarObligacionSupervision),
  };
}

export function obtenerNombreContratistaSupervision(
  contratistaNombre: string | null | undefined
): string {
  return formatearContratistaMayusculas(contratistaNombre);
}
