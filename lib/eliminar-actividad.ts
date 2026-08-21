import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EVIDENCIAS_BUCKET,
  esRutaEvidenciaValida,
  obtenerEvidenciasPorActividadIds,
} from "@/lib/evidencias";

export type EliminarActividadCompletaResult =
  | { success: true; archivosEliminados: number }
  | { success: false; error: string };

async function actividadPerteneceAlUsuario(
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

async function recolectarRutasEvidenciasActividad(
  supabase: SupabaseClient,
  userId: string,
  actividadId: string
): Promise<string[]> {
  const rutas = new Set<string>();
  const evidenciasPorActividad = await obtenerEvidenciasPorActividadIds(supabase, [
    actividadId,
  ]);
  const evidencias = evidenciasPorActividad[actividadId] ?? [];

  for (const evidencia of evidencias) {
    if (esRutaEvidenciaValida(userId, actividadId, evidencia.url)) {
      rutas.add(evidencia.url);
    }
  }

  const carpetaActividad = `${userId}/${actividadId}`;
  const { data: archivos, error: listError } = await supabase.storage
    .from(EVIDENCIAS_BUCKET)
    .list(carpetaActividad, { limit: 100 });

  if (!listError && archivos) {
    for (const archivo of archivos) {
      if (!archivo.name || archivo.name.endsWith("/")) {
        continue;
      }

      rutas.add(`${carpetaActividad}/${archivo.name}`);
    }
  }

  return [...rutas];
}

async function eliminarArchivosStorage(
  supabase: SupabaseClient,
  rutas: string[]
): Promise<void> {
  if (rutas.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(EVIDENCIAS_BUCKET).remove(rutas);

  if (error) {
    throw new Error(`No se pudieron eliminar las evidencias en Storage: ${error.message}`);
  }
}

/**
 * Elimina una actividad y todos sus datos asociados:
 * 1. Archivos en Storage (registrados en BD + huérfanos en la carpeta de la actividad)
 * 2. Registro en actividades (actividad_evidencias cae por ON DELETE CASCADE)
 */
export async function eliminarActividadCompleta(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string
): Promise<EliminarActividadCompletaResult> {
  const actividadIdLimpio = actividadId.trim();

  if (!actividadIdLimpio) {
    return { success: false, error: "Actividad no válida." };
  }

  const pertenece = await actividadPerteneceAlUsuario(supabase, actividadIdLimpio, userId);

  if (!pertenece) {
    return { success: false, error: "No tienes permiso para eliminar esta actividad." };
  }

  try {
    const rutas = await recolectarRutasEvidenciasActividad(
      supabase,
      userId,
      actividadIdLimpio
    );

    await eliminarArchivosStorage(supabase, rutas);

    const { error: deleteError } = await supabase
      .from("actividades")
      .delete()
      .eq("id", actividadIdLimpio)
      .eq("user_id", userId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, archivosEliminados: rutas.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la actividad.";

    return { success: false, error: message };
  }
}
