import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActividadEvidencia,
  ActividadEvidenciaConSignedUrl,
  EvidenciasPorActividad,
} from "@/types/actividad-evidencia";

export const EVIDENCIAS_BUCKET = "evidencias";

export const EVIDENCIAS_MAX_ARCHIVOS = 10;

export const EVIDENCIAS_MAX_BYTES = 5 * 1024 * 1024;

export const EVIDENCIAS_MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function formatearIndicadorEvidencias(cantidad: number): string {
  if (cantidad === 0) {
    return "📷 0 imágenes";
  }

  if (cantidad === 1) {
    return "📷 1 imagen";
  }

  return `📷 ${cantidad} imágenes`;
}

export function sanitizarNombreArchivo(nombre: string): string {
  const base = nombre.trim().replace(/[/\\?%*:|"<>]/g, "-");

  if (!base) {
    return "evidencia.jpg";
  }

  return base.slice(0, 180);
}

export function construirRutaEvidencia(
  userId: string,
  actividadId: string,
  nombreArchivo: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const nombreSeguro = sanitizarNombreArchivo(nombreArchivo);

  return `${userId}/${actividadId}/${timestamp}-${random}-${nombreSeguro}`;
}

export function esRutaEvidenciaValida(
  userId: string,
  actividadId: string,
  url: string
): boolean {
  const prefix = `${userId}/${actividadId}/`;

  return url.startsWith(prefix) && !url.includes("..");
}

export function validarArchivoEvidencia(file: File): string | null {
  if (!EVIDENCIAS_MIME_PERMITIDOS.has(file.type)) {
    return `"${file.name}" no es una imagen válida (JPEG, PNG, WebP o GIF).`;
  }

  if (file.size > EVIDENCIAS_MAX_BYTES) {
    return `"${file.name}" supera el tamaño máximo de 5 MB.`;
  }

  return null;
}

export function validarListaArchivosEvidencia(files: File[]): string | null {
  if (files.length > EVIDENCIAS_MAX_ARCHIVOS) {
    return `Puedes adjuntar hasta ${EVIDENCIAS_MAX_ARCHIVOS} imágenes por actividad.`;
  }

  for (const file of files) {
    const error = validarArchivoEvidencia(file);

    if (error) {
      return error;
    }
  }

  return null;
}

export async function subirEvidenciasActividad({
  supabase,
  userId,
  actividadId,
  archivos,
}: {
  supabase: SupabaseClient;
  userId: string;
  actividadId: string;
  archivos: File[];
}): Promise<void> {
  if (archivos.length === 0) {
    return;
  }

  const errorValidacion = validarListaArchivosEvidencia(archivos);

  if (errorValidacion) {
    throw new Error(errorValidacion);
  }

  for (const archivo of archivos) {
    const storagePath = construirRutaEvidencia(userId, actividadId, archivo.name);
    const buffer = Buffer.from(await archivo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(EVIDENCIAS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: archivo.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`No se pudo subir "${archivo.name}": ${uploadError.message}`);
    }

    const { error: insertError } = await supabase.from("actividad_evidencias").insert({
      actividad_id: actividadId,
      url: storagePath,
      nombre_archivo: sanitizarNombreArchivo(archivo.name),
    });

    if (insertError) {
      await supabase.storage.from(EVIDENCIAS_BUCKET).remove([storagePath]);
      throw new Error(`No se pudo registrar "${archivo.name}": ${insertError.message}`);
    }
  }
}

export async function obtenerEvidenciasPorActividadIds(
  supabase: SupabaseClient,
  actividadIds: string[]
): Promise<EvidenciasPorActividad> {
  if (actividadIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("actividad_evidencias")
    .select("id, actividad_id, url, nombre_archivo, created_at")
    .in("actividad_id", actividadIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const agrupadas: EvidenciasPorActividad = {};

  for (const evidencia of (data ?? []) as ActividadEvidencia[]) {
    if (!agrupadas[evidencia.actividad_id]) {
      agrupadas[evidencia.actividad_id] = [];
    }

    agrupadas[evidencia.actividad_id].push(evidencia);
  }

  return agrupadas;
}

export async function adjuntarSignedUrls(
  supabase: SupabaseClient,
  evidencias: ActividadEvidencia[]
): Promise<ActividadEvidenciaConSignedUrl[]> {
  const resultados: ActividadEvidenciaConSignedUrl[] = [];

  for (const evidencia of evidencias) {
    const { data, error } = await supabase.storage
      .from(EVIDENCIAS_BUCKET)
      .createSignedUrl(evidencia.url, 60 * 60);

    if (error || !data?.signedUrl) {
      continue;
    }

    resultados.push({
      ...evidencia,
      signed_url: data.signedUrl,
    });
  }

  return resultados;
}

export function contarEvidencias(
  evidenciasPorActividad: EvidenciasPorActividad,
  actividadId: string
): number {
  return evidenciasPorActividad[actividadId]?.length ?? 0;
}

export function normalizarConteoEvidenciasRelacion(
  relacion: unknown
): number {
  if (!Array.isArray(relacion) || relacion.length === 0) {
    return 0;
  }

  const primerItem = relacion[0];

  if (
    primerItem &&
    typeof primerItem === "object" &&
    "count" in primerItem &&
    typeof (primerItem as { count: unknown }).count === "number"
  ) {
    return (primerItem as { count: number }).count;
  }

  return 0;
}

export function recolectarEvidenciasDeActividades(
  actividadIds: string[],
  evidenciasPorActividad: EvidenciasPorActividad
): ActividadEvidencia[] {
  const evidencias: ActividadEvidencia[] = [];

  for (const actividadId of actividadIds) {
    const delActividad = evidenciasPorActividad[actividadId];

    if (delActividad) {
      evidencias.push(...delActividad);
    }
  }

  return evidencias;
}
