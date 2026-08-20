"use server";

import {
  parseObligacionesContrato,
  resolverObligacionExactaContrato,
} from "@/lib/clasificar-obligacion";
import { supabase } from "@/lib/supabase";

export type CorregirClasificacionActividadInput = {
  actividadId: string;
  obligacion_detectada: string;
  proyecto_detectado: string;
  tipo_actividad_detectada: string;
};

export type CorregirClasificacionActividadResult =
  | { success: true }
  | { success: false; error: string };

async function getObligacionesContratoTexto(): Promise<string | null> {
  const { data, error } = await supabase
    .from("contratos")
    .select("obligaciones")
    .limit(1)
    .maybeSingle();

  if (error || !data?.obligaciones?.trim()) {
    return null;
  }

  return data.obligaciones;
}

export async function corregirClasificacionActividad(
  input: CorregirClasificacionActividadInput
): Promise<CorregirClasificacionActividadResult> {
  try {
    const obligacionDetectada = input.obligacion_detectada.trim();
    const proyectoDetectado = input.proyecto_detectado.trim();
    const tipoActividadDetectada = input.tipo_actividad_detectada.trim();

    if (!input.actividadId.trim()) {
      return { success: false, error: "La actividad es obligatoria." };
    }

    if (!obligacionDetectada) {
      return { success: false, error: "La obligación detectada es obligatoria." };
    }

    if (!proyectoDetectado) {
      return { success: false, error: "El proyecto detectado es obligatorio." };
    }

    if (!tipoActividadDetectada) {
      return { success: false, error: "El tipo de actividad detectada es obligatorio." };
    }

    const obligacionesTexto = await getObligacionesContratoTexto();

    if (!obligacionesTexto) {
      return {
        success: false,
        error: "No hay obligaciones contractuales configuradas en el contrato activo.",
      };
    }

    const obligacionesContrato = parseObligacionesContrato(obligacionesTexto);
    const obligacionExacta = resolverObligacionExactaContrato(
      obligacionDetectada,
      obligacionesContrato
    );

    if (!obligacionExacta) {
      return {
        success: false,
        error: "La obligación seleccionada debe coincidir exactamente con una del contrato.",
      };
    }

    const { data, error } = await supabase
      .from("actividades")
      .update({
        obligacion_detectada: obligacionExacta,
        proyecto_detectado: proyectoDetectado,
        tipo_actividad_detectada: tipoActividadDetectada,
        clasificacion_manual: true,
        puntaje_clasificacion: 100,
      })
      .eq("id", input.actividadId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "No se encontró la actividad a corregir." };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo guardar la corrección de clasificación.";

    return { success: false, error: message };
  }
}
