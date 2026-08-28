import { extraerFrenteTrabajo } from "@/lib/consolidar-informe";
import { extraerResultadoTrabajo } from "@/lib/extraer-resultado-trabajo";
import type { DefinicionFrenteContexto } from "@/lib/parsear-frentes-contexto-tecnico";
import type { Actividad } from "@/types/actividad";

export type OpcionesAgrupacionTemporal = {
  frentesContexto?: DefinicionFrenteContexto[];
};

function obtenerTextoReferenciaActividad(actividad: Actividad): string {
  return [
    actividad.actividad_original,
    actividad.redaccion_ia,
    actividad.resumen_ia,
    actividad.proyecto_detectado,
    actividad.tipo_actividad_detectada,
    ...actividad.palabras_clave,
  ].join(" ");
}

function detectarFrenteDesdeContexto(
  texto: string,
  frentesContexto: DefinicionFrenteContexto[]
): string {
  for (const definicion of frentesContexto) {
    if (definicion.patrones.some((patron) => patron.test(texto))) {
      return definicion.id;
    }
  }

  return "";
}

/** Frente de trabajo para consolidación temporal (contexto_tecnico → fallback consolidar-informe). */
export function extraerFrenteParaAgrupacion(
  actividad: Actividad,
  opciones?: OpcionesAgrupacionTemporal
): string {
  const texto = obtenerTextoReferenciaActividad(actividad);
  const frentesContexto = opciones?.frentesContexto ?? [];

  const frenteContexto = detectarFrenteDesdeContexto(texto, frentesContexto);

  if (frenteContexto) {
    return frenteContexto;
  }

  return extraerFrenteTrabajo(actividad) ?? "";
}

/**
 * Clave estable para agrupar actividades equivalentes dentro de una obligación.
 * Prioridad: frente + resultado → resultado → frente.
 */
export function obtenerClaveEquivalenciaTemporal(
  actividad: Actividad,
  opciones?: OpcionesAgrupacionTemporal
): string | null {
  const frente = extraerFrenteParaAgrupacion(actividad, opciones);
  const resultado =
    extraerResultadoTrabajo(actividad.actividad_original, opciones) ?? "";

  if (frente && resultado) {
    return `frente-resultado:${frente}|${resultado}`;
  }

  if (resultado) {
    return `resultado:${resultado}`;
  }

  if (frente) {
    return `frente:${frente}`;
  }

  return null;
}

export function agruparActividadesPorEquivalenciaTemporal(
  actividades: Actividad[],
  opciones?: OpcionesAgrupacionTemporal
): Actividad[][] {
  const actividadesOrdenadas = [...actividades].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const gruposPorClave = new Map<string, Actividad[]>();
  const actividadesSinClave: Actividad[] = [];

  for (const actividad of actividadesOrdenadas) {
    const clave = obtenerClaveEquivalenciaTemporal(actividad, opciones);

    if (!clave) {
      actividadesSinClave.push(actividad);
      continue;
    }

    const grupo = gruposPorClave.get(clave) ?? [];
    grupo.push(actividad);
    gruposPorClave.set(clave, grupo);
  }

  const grupos: Actividad[][] = [
    ...[...gruposPorClave.values()].map((grupo) =>
      [...grupo].sort((a, b) => a.fecha.localeCompare(b.fecha))
    ),
    ...actividadesSinClave.map((actividad) => [actividad]),
  ];

  return grupos.sort((grupoA, grupoB) =>
    (grupoA[0]?.fecha ?? "").localeCompare(grupoB[0]?.fecha ?? "")
  );
}
