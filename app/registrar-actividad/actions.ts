"use server";

import { analizarActividad } from "@/lib/analizar-actividad";
import { getConfiguracionIA, toConfiguracionIAContext } from "@/lib/configuracion-ia";
import { supabase } from "@/lib/supabase";
import type {
  AnalizarYGuardarActividadInput,
  AnalizarYGuardarActividadResult,
} from "@/types/analisis-actividad";

type ContratoActivo = {
  id: string;
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
};

function contratoEstaCompleto(contrato: ContratoActivo): boolean {
  return (
    contrato.nombre.trim() !== "" &&
    contrato.entidad.trim() !== "" &&
    contrato.objeto_contractual.trim() !== "" &&
    contrato.obligaciones.trim() !== ""
  );
}

async function getContratoActivo(): Promise<ContratoActivo | null> {
  const { data, error } = await supabase
    .from("contratos")
    .select("id, nombre, entidad, objeto_contractual, obligaciones")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function analizarYGuardarActividad(
  input: AnalizarYGuardarActividadInput
): Promise<AnalizarYGuardarActividadResult> {
  try {
    const actividadOriginal = input.actividad.trim();

    if (!input.fecha.trim()) {
      return { success: false, error: "La fecha es obligatoria." };
    }

    if (!actividadOriginal) {
      return { success: false, error: "La actividad es obligatoria." };
    }

    const contrato = await getContratoActivo();

    if (!contrato || !contratoEstaCompleto(contrato)) {
      return {
        success: false,
        error: "No hay un contrato activo completo configurado.",
      };
    }

    const configuracion = toConfiguracionIAContext(await getConfiguracionIA().catch(() => null));

    const analisis = await analizarActividad({
      nombre: contrato.nombre,
      entidad: contrato.entidad,
      objetoContractual: contrato.objeto_contractual,
      obligaciones: contrato.obligaciones,
      actividadOriginal,
      configuracion,
    });

    const { error } = await supabase.from("actividades").insert({
      contrato_id: contrato.id,
      fecha: input.fecha,
      actividad_original: actividadOriginal,
      tipo_actividad_detectada: analisis.tipo_actividad_detectada,
      proyecto_detectado: analisis.proyecto_detectado,
      obligacion_detectada: analisis.obligacion_detectada,
      clasificacion_manual: false,
      puntaje_clasificacion: analisis.puntaje_clasificacion,
      redaccion_ia: analisis.redaccion_ia,
      resumen_ia: analisis.resumen_ia,
      palabras_clave: analisis.palabras_clave,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      proyecto_detectado: analisis.proyecto_detectado,
      obligacion_detectada: analisis.obligacion_detectada,
      resumen_ia: analisis.resumen_ia,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo analizar y guardar la actividad.";

    return { success: false, error: message };
  }
}
