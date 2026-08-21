import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EVIDENCIAS_BUCKET,
  EVIDENCIAS_MAX_ARCHIVOS,
  esRutaEvidenciaValida,
  sanitizarNombreArchivo,
} from "@/lib/evidencias";
import {
  camposPersistenciaDesdeAnalisis,
  contratoEstaCompleto,
  ejecutarAnalisisActividad,
  obtenerContratoActivo,
  type ActividadCamposReanalizados,
} from "@/lib/pipeline-analisis-actividad";
import type { EvidenciaReferenciaInput } from "@/types/analisis-actividad";

export type GestionActividadError = {
  success: false;
  error: string;
};

export async function actividadPerteneceAlUsuario(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("actividades")
    .select("id")
    .eq("id", actividadId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

async function contarEvidenciasActividad(
  supabase: SupabaseClient,
  actividadId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("actividad_evidencias")
    .select("id", { count: "exact", head: true })
    .eq("actividad_id", actividadId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function actualizarActividadConReanalisis(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string,
  input: { fecha: string; actividad_original: string }
): Promise<{ success: true; actividad: ActividadCamposReanalizados } | GestionActividadError> {
  const actividadIdLimpio = actividadId.trim();
  const fecha = input.fecha.trim();
  const actividadOriginal = input.actividad_original.trim();

  if (!actividadIdLimpio) {
    return { success: false, error: "Actividad no válida." };
  }

  if (!fecha) {
    return { success: false, error: "La fecha es obligatoria." };
  }

  if (!actividadOriginal) {
    return { success: false, error: "La descripción es obligatoria." };
  }

  const pertenece = await actividadPerteneceAlUsuario(supabase, actividadIdLimpio, userId);

  if (!pertenece) {
    return { success: false, error: "No tienes permiso para editar esta actividad." };
  }

  const contrato = await obtenerContratoActivo(supabase);

  if (!contrato || !contratoEstaCompleto(contrato)) {
    return {
      success: false,
      error: "No hay un contrato activo completo configurado.",
    };
  }

  let analisis;

  try {
    analisis = await ejecutarAnalisisActividad(contrato, actividadOriginal);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo analizar la actividad con IA.";

    return { success: false, error: message };
  }

  const { data, error } = await supabase
    .from("actividades")
    .update({
      fecha,
      actividad_original: actividadOriginal,
      ...camposPersistenciaDesdeAnalisis(analisis),
    })
    .eq("id", actividadIdLimpio)
    .eq("user_id", userId)
    .select(
      "id, fecha, actividad_original, tipo_actividad_detectada, proyecto_detectado, obligacion_detectada, clasificacion_manual, puntaje_clasificacion, redaccion_ia, resumen_ia, palabras_clave"
    )
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "No se pudo actualizar la actividad." };
  }

  return { success: true, actividad: data };
}

export async function guardarReferenciasEvidenciasActividad(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string,
  evidencias: EvidenciaReferenciaInput[]
): Promise<{ success: true; evidencias_count: number } | GestionActividadError> {
  const actividadIdLimpio = actividadId.trim();

  if (!actividadIdLimpio) {
    return { success: false, error: "Actividad no válida." };
  }

  if (evidencias.length === 0) {
    return { success: true, evidencias_count: 0 };
  }

  const pertenece = await actividadPerteneceAlUsuario(supabase, actividadIdLimpio, userId);

  if (!pertenece) {
    return { success: false, error: "La actividad no pertenece a tu cuenta." };
  }

  const actuales = await contarEvidenciasActividad(supabase, actividadIdLimpio);

  if (actuales + evidencias.length > EVIDENCIAS_MAX_ARCHIVOS) {
    return {
      success: false,
      error: `Puedes tener hasta ${EVIDENCIAS_MAX_ARCHIVOS} imágenes por actividad.`,
    };
  }

  for (const evidencia of evidencias) {
    const url = evidencia.url.trim();
    const nombreArchivo = sanitizarNombreArchivo(evidencia.nombre_archivo);

    if (!url || !nombreArchivo) {
      return { success: false, error: "Referencia de evidencia inválida." };
    }

    if (!esRutaEvidenciaValida(userId, actividadIdLimpio, url)) {
      return { success: false, error: "Ruta de evidencia no autorizada." };
    }
  }

  const { error } = await supabase.from("actividad_evidencias").insert(
    evidencias.map((evidencia) => ({
      actividad_id: actividadIdLimpio,
      url: evidencia.url.trim(),
      nombre_archivo: sanitizarNombreArchivo(evidencia.nombre_archivo),
    }))
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, evidencias_count: evidencias.length };
}

export async function eliminarEvidenciaDeActividad(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string,
  evidenciaId: string
): Promise<{ success: true } | GestionActividadError> {
  const actividadIdLimpio = actividadId.trim();
  const evidenciaIdLimpio = evidenciaId.trim();

  if (!actividadIdLimpio || !evidenciaIdLimpio) {
    return { success: false, error: "Evidencia no válida." };
  }

  const pertenece = await actividadPerteneceAlUsuario(supabase, actividadIdLimpio, userId);

  if (!pertenece) {
    return { success: false, error: "No tienes permiso para modificar esta actividad." };
  }

  const { data: evidencia, error: selectError } = await supabase
    .from("actividad_evidencias")
    .select("id, url")
    .eq("id", evidenciaIdLimpio)
    .eq("actividad_id", actividadIdLimpio)
    .maybeSingle();

  if (selectError) {
    return { success: false, error: selectError.message };
  }

  if (!evidencia) {
    return { success: false, error: "La evidencia no existe." };
  }

  if (!esRutaEvidenciaValida(userId, actividadIdLimpio, evidencia.url)) {
    return { success: false, error: "Ruta de evidencia no autorizada." };
  }

  const { error: storageError } = await supabase.storage
    .from(EVIDENCIAS_BUCKET)
    .remove([evidencia.url]);

  if (storageError) {
    return {
      success: false,
      error: `No se pudo eliminar el archivo en Storage: ${storageError.message}`,
    };
  }

  const { error: deleteError } = await supabase
    .from("actividad_evidencias")
    .delete()
    .eq("id", evidenciaIdLimpio)
    .eq("actividad_id", actividadIdLimpio);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}
