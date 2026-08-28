import type { AnalisisActividadResult } from "@/types/analisis-actividad";

export function validarAnalisisActividadEntrada(data: unknown): AnalisisActividadResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  const camposRequeridos = [
    "tipo_actividad_detectada",
    "proyecto_detectado",
    "obligacion_detectada",
    "puntaje_clasificacion",
    "redaccion_ia",
    "resumen_ia",
    "palabras_clave",
  ] as const;

  for (const campo of camposRequeridos) {
    if (!(campo in record)) {
      return null;
    }
  }

  if (
    typeof record.tipo_actividad_detectada !== "string" ||
    typeof record.proyecto_detectado !== "string" ||
    typeof record.obligacion_detectada !== "string" ||
    typeof record.redaccion_ia !== "string" ||
    typeof record.resumen_ia !== "string" ||
    typeof record.puntaje_clasificacion !== "number" ||
    !Array.isArray(record.palabras_clave) ||
    !record.palabras_clave.every((item) => typeof item === "string")
  ) {
    return null;
  }

  return {
    tipo_actividad_detectada: record.tipo_actividad_detectada.trim(),
    proyecto_detectado: record.proyecto_detectado.trim(),
    obligacion_detectada: record.obligacion_detectada.trim(),
    puntaje_clasificacion: record.puntaje_clasificacion,
    redaccion_ia: record.redaccion_ia.trim(),
    resumen_ia: record.resumen_ia.trim(),
    palabras_clave: record.palabras_clave.map((item) => String(item).trim()).filter(Boolean),
  };
}
