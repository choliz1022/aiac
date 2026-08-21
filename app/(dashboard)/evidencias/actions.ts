"use server";

import { adjuntarSignedUrls, obtenerEvidenciasPorActividadIds } from "@/lib/evidencias";
import { createClient } from "@/lib/supabase/server";
import type { ActividadEvidenciaConSignedUrl } from "@/types/actividad-evidencia";

export async function listarEvidenciasActividad(
  actividadId: string
): Promise<
  | { success: true; evidencias: ActividadEvidenciaConSignedUrl[] }
  | { success: false; error: string }
> {
  try {
    if (!actividadId.trim()) {
      return { success: false, error: "Actividad no válida." };
    }

    const supabase = await createClient();
    const evidenciasPorActividad = await obtenerEvidenciasPorActividadIds(supabase, [
      actividadId,
    ]);
    const evidencias = evidenciasPorActividad[actividadId] ?? [];
    const evidenciasConUrl = await adjuntarSignedUrls(supabase, evidencias);

    return { success: true, evidencias: evidenciasConUrl };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar las evidencias.";

    return { success: false, error: message };
  }
}
