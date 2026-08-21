"use client";

import { createClient } from "@/lib/supabase/client";
import {
  construirRutaEvidencia,
  EVIDENCIAS_BUCKET,
  sanitizarNombreArchivo,
  validarListaArchivosEvidencia,
} from "@/lib/evidencias";
import type { EvidenciaReferenciaInput } from "@/types/analisis-actividad";

export async function subirEvidenciasAlStorage(
  actividadId: string,
  archivos: File[]
): Promise<EvidenciaReferenciaInput[]> {
  if (archivos.length === 0) {
    return [];
  }

  const errorValidacion = validarListaArchivosEvidencia(archivos);

  if (errorValidacion) {
    throw new Error(errorValidacion);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Debes iniciar sesión para subir evidencias.");
  }

  const referencias: EvidenciaReferenciaInput[] = [];
  const rutasSubidas: string[] = [];

  try {
    for (const archivo of archivos) {
      const storagePath = construirRutaEvidencia(user.id, actividadId, archivo.name);

      const { error: uploadError } = await supabase.storage
        .from(EVIDENCIAS_BUCKET)
        .upload(storagePath, archivo, {
          contentType: archivo.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`No se pudo subir "${archivo.name}": ${uploadError.message}`);
      }

      rutasSubidas.push(storagePath);
      referencias.push({
        url: storagePath,
        nombre_archivo: sanitizarNombreArchivo(archivo.name),
      });
    }

    return referencias;
  } catch (error) {
    if (rutasSubidas.length > 0) {
      await supabase.storage.from(EVIDENCIAS_BUCKET).remove(rutasSubidas);
    }

    throw error;
  }
}

export async function eliminarEvidenciasStorage(rutas: string[]): Promise<void> {
  if (rutas.length === 0) {
    return;
  }

  const supabase = createClient();
  await supabase.storage.from(EVIDENCIAS_BUCKET).remove(rutas);
}
