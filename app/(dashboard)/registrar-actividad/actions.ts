"use server";

import { eliminarActividadCompleta } from "@/lib/eliminar-actividad";
import { actividadPerteneceAlContratoActivo } from "@/lib/actividad-acceso";
import { getContratoActivoId } from "@/lib/contrato-activo";
import { guardarReferenciasEvidenciasActividad } from "@/lib/gestion-actividad";
import {
  camposPersistenciaDesdeAnalisis,
  contratoEstaCompleto,
  ejecutarAnalisisActividad,
  ejecutarAnalisisActividadParaPresentacion,
  obtenerContratoActivo,
  regenerarRedaccionActividadParaPresentacion,
} from "@/lib/pipeline-analisis-actividad";
import { validarAnalisisActividadEntrada } from "@/lib/validar-analisis-actividad";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalizarActividadPreviewInput,
  AnalizarActividadPreviewResult,
  AnalizarYGuardarActividadInput,
  AnalizarYGuardarActividadResult,
  AnalisisActividadResult,
  GuardarActividadConfirmadaInput,
  GuardarActividadConfirmadaResult,
  GuardarReferenciasEvidenciasInput,
  GuardarReferenciasEvidenciasResult,
  ReanalizarRedaccionActividadInput,
  ReanalizarRedaccionActividadResult,
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

async function actividadPerteneceAlContratoActivoRegistro(
  actividadId: string,
  userId: string
): Promise<boolean> {
  const contratoActivoId = await getContratoActivoId();

  if (!contratoActivoId) {
    return false;
  }

  const supabase = await createClient();

  return actividadPerteneceAlContratoActivo(
    supabase,
    actividadId,
    userId,
    contratoActivoId
  );
}

async function obtenerContratoYUsuario(): Promise<
  | {
      contrato: NonNullable<Awaited<ReturnType<typeof obtenerContratoActivo>>>;
      userId: string;
    }
  | { error: string }
> {
  const contrato = await obtenerContratoActivo();

  if (!contrato || !contratoEstaCompleto(contrato)) {
    return { error: "No hay un contrato activo completo configurado." };
  }

  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { error: "Debes iniciar sesión para registrar actividades." };
  }

  return { contrato, userId };
}

async function insertarActividadConAnalisis({
  fecha,
  actividadOriginal,
  analisis,
}: {
  fecha: string;
  actividadOriginal: string;
  analisis: AnalisisActividadResult;
}): Promise<{ actividad_id: string } | { error: string }> {
  const contexto = await obtenerContratoYUsuario();

  if ("error" in contexto) {
    return { error: contexto.error };
  }

  const supabase = await createClient();

  const { data: actividadInsertada, error } = await supabase
    .from("actividades")
    .insert({
      contrato_id: contexto.contrato.id,
      fecha,
      actividad_original: actividadOriginal,
      ...camposPersistenciaDesdeAnalisis(analisis),
    })
    .select("id")
    .single();

  if (error || !actividadInsertada) {
    return { error: error?.message ?? "No se pudo guardar la actividad." };
  }

  return { actividad_id: actividadInsertada.id };
}

export async function analizarActividadPreview(
  input: AnalizarActividadPreviewInput
): Promise<AnalizarActividadPreviewResult> {
  try {
    const actividadOriginal = input.actividad.trim();

    if (!actividadOriginal) {
      return { success: false, error: "La actividad es obligatoria." };
    }

    const contexto = await obtenerContratoYUsuario();

    if ("error" in contexto) {
      return { success: false, error: contexto.error };
    }

    const analisis = await ejecutarAnalisisActividadParaPresentacion(
      contexto.contrato,
      actividadOriginal
    );

    return { success: true, analisis };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo analizar la actividad.";

    return { success: false, error: message };
  }
}

export async function reanalizarRedaccionActividad(
  input: ReanalizarRedaccionActividadInput
): Promise<ReanalizarRedaccionActividadResult> {
  try {
    const actividadOriginal = input.actividad.trim();

    if (!actividadOriginal) {
      return { success: false, error: "La actividad es obligatoria." };
    }

    const analisisBase = validarAnalisisActividadEntrada(input.analisis);

    if (!analisisBase) {
      return { success: false, error: "El análisis IA actual no es válido." };
    }

    const contexto = await obtenerContratoYUsuario();

    if ("error" in contexto) {
      return { success: false, error: contexto.error };
    }

    const analisis = await regenerarRedaccionActividadParaPresentacion(
      contexto.contrato,
      actividadOriginal,
      analisisBase
    );

    return { success: true, analisis };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo regenerar la redacción.";

    return { success: false, error: message };
  }
}

export async function guardarActividadConfirmada(
  input: GuardarActividadConfirmadaInput
): Promise<GuardarActividadConfirmadaResult> {
  try {
    const actividadOriginal = input.actividad.trim();

    if (!input.fecha.trim()) {
      return { success: false, error: "La fecha es obligatoria." };
    }

    if (!actividadOriginal) {
      return { success: false, error: "La actividad es obligatoria." };
    }

    const analisis = validarAnalisisActividadEntrada(input.analisis);

    if (!analisis) {
      return { success: false, error: "El análisis IA recibido no es válido." };
    }

    const resultado = await insertarActividadConAnalisis({
      fecha: input.fecha,
      actividadOriginal,
      analisis,
    });

    if ("error" in resultado) {
      return { success: false, error: resultado.error };
    }

    return { success: true, actividad_id: resultado.actividad_id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar la actividad.";

    return { success: false, error: message };
  }
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

    const contexto = await obtenerContratoYUsuario();

    if ("error" in contexto) {
      return { success: false, error: contexto.error };
    }

    const analisis = await ejecutarAnalisisActividad(contexto.contrato, actividadOriginal);

    const resultado = await insertarActividadConAnalisis({
      fecha: input.fecha,
      actividadOriginal,
      analisis,
    });

    if ("error" in resultado) {
      return { success: false, error: resultado.error };
    }

    return {
      success: true,
      actividad_id: resultado.actividad_id,
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

    const pertenece = await actividadPerteneceAlContratoActivoRegistro(actividadId, userId);

    if (!pertenece) {
      return {
        success: false,
        error: "La actividad no pertenece al contrato activo.",
      };
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
