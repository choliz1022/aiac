"use server";

import { consolidarObligacionInforme } from "@/lib/consolidar-informe";
import { getConfiguracionIA } from "@/lib/configuracion-ia";
import {
  asignarActividadesAObligaciones,
  calcularRangoFechas,
  construirInformeMensual,
  MENSAJE_OBLIGACION_SIN_ACTIVIDADES,
  parseObligacionesContrato,
} from "@/lib/informe-mensual";
import { supabase } from "@/lib/supabase";
import type { Actividad } from "@/types/actividad";
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
  const { data, error } = await supabase
    .from("contratos")
    .select("nombre, entidad, objeto_contractual, obligaciones")
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

async function consolidarInformePorObligaciones(
  contrato: ContratoInforme,
  actividades: Actividad[],
  contextoTecnico: string | null
): Promise<InformeMensualObligacion[]> {
  const obligacionesContrato = parseObligacionesContrato(contrato.obligaciones);

  if (obligacionesContrato.length === 0) {
    throw new Error("El contrato activo no tiene obligaciones contractuales configuradas.");
  }

  const grupos = asignarActividadesAObligaciones(actividades, obligacionesContrato);
  const obligaciones: InformeMensualObligacion[] = [];
  const idsConsolidadosEnInforme = new Set<string>();

  for (const nombre of obligacionesContrato) {
    const actividadesObligacion = (grupos.get(nombre) ?? []).filter(
      (actividad) => !idsConsolidadosEnInforme.has(actividad.id)
    );

    if (actividadesObligacion.length === 0) {
      obligaciones.push({
        nombre,
        actividadesConsolidadas: [],
        mensajeSinActividades: MENSAJE_OBLIGACION_SIN_ACTIVIDADES,
      });
      continue;
    }

    const actividadesConsolidadas = await consolidarObligacionInforme({
      obligacion: nombre,
      contrato,
      actividades: actividadesObligacion,
      idsExcluidos: idsConsolidadosEnInforme,
      contextoTecnico,
    });

    for (const consolidacion of actividadesConsolidadas) {
      for (const id of consolidacion.actividades_origen_ids) {
        idsConsolidadosEnInforme.add(id);
      }
    }

    obligaciones.push({
      nombre,
      actividadesConsolidadas,
    });
  }

  return obligaciones;
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

    const configuracion = await getConfiguracionIA().catch(() => null);
    const contextoTecnico = configuracion?.contexto_tecnico.trim() || null;

    const obligaciones = await consolidarInformePorObligaciones(
      contrato,
      actividades,
      contextoTecnico
    );

    const informe = construirInformeMensual({
      contrato,
      actividades,
      obligaciones,
      mes: input.mes,
      anio: input.anio,
    });

    return { success: true, informe };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el informe mensual.";

    return { success: false, error: message };
  }
}
