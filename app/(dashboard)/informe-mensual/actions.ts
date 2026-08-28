"use server";

import { adjuntarSignedUrls, obtenerEvidenciasPorActividadIds } from "@/lib/evidencias";
import {
  asignarActividadesAObligaciones,
  calcularRangoFechas,
  construirInformeMensual,
  construirObligacionesInformeContractual,
  parseObligacionesContrato,
} from "@/lib/informe-mensual";
import { prepararInformeSupervision } from "@/lib/informe-supervision";
import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionIAContext } from "@/types/configuracion-ia";
import type { Actividad } from "@/types/actividad";
import type { ActividadEvidenciaConSignedUrl } from "@/types/actividad-evidencia";
import { getConfiguracionIA, toConfiguracionIAContext } from "@/lib/configuracion-ia";
import type {
  GenerarInformeResult,
  InformeMensualContrato,
  InformeMensualInput,
  InformeMensualObligacion,
} from "@/types/informe-mensual";

type ContratoInforme = InformeMensualContrato & {
  obligaciones: string;
};

async function getContratoActivo(): Promise<ContratoInforme | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .select(
      "nombre, entidad, objeto_contractual, obligaciones, contratista_nombre, contrato_fecha_inicio, contrato_fecha_fin, supervisor_nombre, supervisor_cargo"
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getActividadesDelPeriodo(
  mes: number,
  anio: number
): Promise<Actividad[]> {
  const { inicio, fin } = calcularRangoFechas(mes, anio);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("actividades")
    .select(
      "id, contrato_id, fecha, actividad_original, tipo_actividad_detectada, proyecto_detectado, obligacion_detectada, clasificacion_manual, puntaje_clasificacion, redaccion_ia, resumen_ia, palabras_clave, created_at"
    )
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((actividad) => ({
    ...actividad,
    clasificacion_manual: actividad.clasificacion_manual ?? false,
    puntaje_clasificacion: actividad.puntaje_clasificacion ?? 0,
  }));
}

function validarPeriodo(mes: number, anio: number): string | null {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return "Selecciona un mes válido.";
  }

  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return "Selecciona un año válido.";
  }

  return null;
}

async function adjuntarSignedUrlsPorActividad(
  actividadIds: string[],
  evidenciasPorActividad: Awaited<ReturnType<typeof obtenerEvidenciasPorActividadIds>>
): Promise<Record<string, ActividadEvidenciaConSignedUrl[]>> {
  const supabase = await createClient();
  const resultado: Record<string, ActividadEvidenciaConSignedUrl[]> = {};

  for (const actividadId of actividadIds) {
    const evidencias = evidenciasPorActividad[actividadId] ?? [];
    resultado[actividadId] = await adjuntarSignedUrls(supabase, evidencias);
  }

  return resultado;
}

async function construirInformePorObligaciones(
  contrato: ContratoInforme,
  actividades: Actividad[],
  configuracion: ConfiguracionIAContext | null
): Promise<InformeMensualObligacion[]> {
  const obligacionesContrato = parseObligacionesContrato(contrato.obligaciones);

  if (obligacionesContrato.length === 0) {
    throw new Error("El contrato activo no tiene obligaciones contractuales configuradas.");
  }

  const supabase = await createClient();
  const actividadIds = actividades.map((actividad) => actividad.id);
  const evidenciasPorActividad = await obtenerEvidenciasPorActividadIds(
    supabase,
    actividadIds
  );
  const evidenciasConUrl = await adjuntarSignedUrlsPorActividad(
    actividadIds,
    evidenciasPorActividad
  );

  const grupos = asignarActividadesAObligaciones(actividades, obligacionesContrato);

  return construirObligacionesInformeContractual(
    obligacionesContrato,
    grupos,
    evidenciasConUrl,
    configuracion
  );
}

export async function generarInformeMensual(
  input: InformeMensualInput
): Promise<GenerarInformeResult> {
  try {
    const errorPeriodo = validarPeriodo(input.mes, input.anio);

    if (errorPeriodo) {
      return { success: false, error: errorPeriodo };
    }

    const contrato = await getContratoActivo();

    if (!contrato) {
      return {
        success: false,
        error: "No hay un contrato activo configurado.",
      };
    }

    const actividades = await getActividadesDelPeriodo(input.mes, input.anio);

    if (actividades.length === 0) {
      return { success: true, sinActividades: true };
    }

    const configuracion = toConfiguracionIAContext(await getConfiguracionIA());
    const tipoInforme = input.tipoInforme ?? "contratista";
    const obligaciones = await construirInformePorObligaciones(
      contrato,
      actividades,
      configuracion
    );

    const informeContractual = construirInformeMensual({
      contrato: {
        nombre: contrato.nombre,
        entidad: contrato.entidad,
        objeto_contractual: contrato.objeto_contractual,
        contratista_nombre: contrato.contratista_nombre,
        contrato_fecha_inicio: contrato.contrato_fecha_inicio,
        contrato_fecha_fin: contrato.contrato_fecha_fin,
        supervisor_nombre: contrato.supervisor_nombre,
        supervisor_cargo: contrato.supervisor_cargo,
      },
      actividades,
      obligaciones,
      mes: input.mes,
      anio: input.anio,
    });

    const informe =
      tipoInforme === "supervision"
        ? prepararInformeSupervision(informeContractual)
        : informeContractual;

    return { success: true, informe };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el informe mensual.";

    return { success: false, error: message };
  }
}
