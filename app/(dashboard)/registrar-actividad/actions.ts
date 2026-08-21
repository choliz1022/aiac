"use server";

import { eliminarActividadCompleta } from "@/lib/eliminar-actividad";
import { guardarReferenciasEvidenciasActividad } from "@/lib/gestion-actividad";
import {
  camposPersistenciaDesdeAnalisis,
  contratoEstaCompleto,
  ejecutarAnalisisActividad,
  obtenerContratoActivo,
} from "@/lib/pipeline-analisis-actividad";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalizarYGuardarActividadInput,
  AnalizarYGuardarActividadResult,
  GuardarReferenciasEvidenciasInput,
  GuardarReferenciasEvidenciasResult,
} from "@/types/analisis-actividad";

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

async function actividadPerteneceAlUsuario(
  actividadId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actividades")
    .select("id")
    .eq("id", actividadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
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

    const supabase = await createClient();
    const contrato = await obtenerContratoActivo(supabase);

    if (!contrato || !contratoEstaCompleto(contrato)) {
      return {
        success: false,
        error: "No hay un contrato activo completo configurado.",
      };
    }

    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return { success: false, error: "Debes iniciar sesión para registrar actividades." };
    }

    const analisis = await ejecutarAnalisisActividad(contrato, actividadOriginal);

    const { data: actividadInsertada, error } = await supabase
      .from("actividades")
      .insert({
        contrato_id: contrato.id,
        fecha: input.fecha,
        actividad_original: actividadOriginal,
        ...camposPersistenciaDesdeAnalisis(analisis),
      })
      .select("id")
      .single();

    if (error || !actividadInsertada) {
      return { success: false, error: error?.message ?? "No se pudo guardar la actividad." };
    }

    return {
      success: true,
      actividad_id: actividadInsertada.id,
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

export async function guardarReferenciasEvidencias(
  input: GuardarReferenciasEvidenciasInput
): Promise<GuardarReferenciasEvidenciasResult> {
  try {
    const actividadId = input.actividadId.trim();

    if (!actividadId) {
      return { success: false, error: "Actividad no válida." };
    }

    if (input.evidencias.length === 0) {
      return { success: true, evidencias_count: 0 };
    }

    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return { success: false, error: "Debes iniciar sesión para registrar evidencias." };
    }

    const pertenece = await actividadPerteneceAlUsuario(actividadId, userId);

    if (!pertenece) {
      return { success: false, error: "La actividad no pertenece a tu cuenta." };
    }

    const supabase = await createClient();
    const resultado = await guardarReferenciasEvidenciasActividad(
      supabase,
      actividadId,
      userId,
      input.evidencias
    );

    if (!resultado.success) {
      return resultado;
    }

    return { success: true, evidencias_count: resultado.evidencias_count };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron guardar las referencias.";

    return { success: false, error: message };
  }
}

export async function revertirActividadRegistrada(
  actividadId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return { success: false, error: "Sesión no válida." };
    }

    const supabase = await createClient();
    const resultado = await eliminarActividadCompleta(supabase, actividadId, userId);

    if (!resultado.success) {
      return { success: false, error: resultado.error };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo revertir la actividad.";

    return { success: false, error: message };
  }
}
