import { analizarActividad } from "@/lib/analizar-actividad";
import { corregirOrtografiaCamposPresentacion } from "@/lib/correccion-ortografica-presentacion";
import { getConfiguracionIA, toConfiguracionIAContext } from "@/lib/configuracion-ia";
import { combinarTextoReglasConfiguracion } from "@/lib/configuracion-ia";
import { aplicarReglasNoExpandirRedaccion } from "@/lib/reglas-configuracion-ia-redaccion";
import { regenerarRedaccionActividad } from "@/lib/regenerar-redaccion-actividad";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalisisActividadResult } from "@/types/analisis-actividad";

/**
 * Campos de `actividades` derivados del pipeline IA (OpenAI + validación de obligación).
 * Deben regenerarse cuando cambia `actividad_original` para mantener consistencia.
 */
export const CAMPOS_DERIVADOS_IA = [
  "tipo_actividad_detectada",
  "proyecto_detectado",
  "obligacion_detectada",
  "puntaje_clasificacion",
  "redaccion_ia",
  "resumen_ia",
  "palabras_clave",
  "clasificacion_manual",
] as const;

export type CampoDerivadoIa = (typeof CAMPOS_DERIVADOS_IA)[number];

export type ContratoActivo = {
  id: string;
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
};

export function contratoEstaCompleto(contrato: ContratoActivo): boolean {
  return (
    contrato.nombre.trim() !== "" &&
    contrato.entidad.trim() !== "" &&
    contrato.objeto_contractual.trim() !== "" &&
    contrato.obligaciones.trim() !== ""
  );
}

export async function obtenerContratoActivo(
  supabase: SupabaseClient
): Promise<ContratoActivo | null> {
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

export async function ejecutarAnalisisActividad(
  contrato: ContratoActivo,
  actividadOriginal: string
): Promise<AnalisisActividadResult> {
  const configuracion = toConfiguracionIAContext(await getConfiguracionIA().catch(() => null));

  return analizarActividad({
    nombre: contrato.nombre,
    entidad: contrato.entidad,
    objetoContractual: contrato.objeto_contractual,
    obligaciones: contrato.obligaciones,
    actividadOriginal,
    configuracion,
  });
}

/** Análisis IA + corrección ortográfica previa a mostrar la vista previa. */
export async function ejecutarAnalisisActividadParaPresentacion(
  contrato: ContratoActivo,
  actividadOriginal: string
): Promise<AnalisisActividadResult> {
  const analisis = await ejecutarAnalisisActividad(contrato, actividadOriginal);
  return corregirOrtografiaCamposPresentacion(analisis);
}

/** Regenera solo redacción y resumen; mantiene clasificación, obligación y proyecto. */
export async function regenerarRedaccionActividadParaPresentacion(
  contrato: ContratoActivo,
  actividadOriginal: string,
  analisisBase: AnalisisActividadResult
): Promise<AnalisisActividadResult> {
  const configuracion = toConfiguracionIAContext(await getConfiguracionIA().catch(() => null));
  const regenerada = await regenerarRedaccionActividad(
    contrato,
    actividadOriginal,
    analisisBase
  );

  const textoReglas = combinarTextoReglasConfiguracion(configuracion);

  const redaccionAjustada = aplicarReglasNoExpandirRedaccion({
    redaccion_ia: regenerada.redaccion_ia,
    resumen_ia: regenerada.resumen_ia,
    actividadOriginal,
    textoReglas,
  });

  return corregirOrtografiaCamposPresentacion({
    ...analisisBase,
    redaccion_ia: redaccionAjustada.redaccion_ia,
    resumen_ia: redaccionAjustada.resumen_ia,
  });
}

export function camposPersistenciaDesdeAnalisis(analisis: AnalisisActividadResult) {
  return {
    tipo_actividad_detectada: analisis.tipo_actividad_detectada,
    proyecto_detectado: analisis.proyecto_detectado,
    obligacion_detectada: analisis.obligacion_detectada,
    clasificacion_manual: false,
    puntaje_clasificacion: analisis.puntaje_clasificacion,
    redaccion_ia: analisis.redaccion_ia,
    resumen_ia: analisis.resumen_ia,
    palabras_clave: analisis.palabras_clave,
  };
}

export type ActividadCamposEditables = {
  fecha: string;
  actividad_original: string;
};

export type ActividadCamposReanalizados = ActividadCamposEditables &
  ReturnType<typeof camposPersistenciaDesdeAnalisis> & {
    id: string;
  };
