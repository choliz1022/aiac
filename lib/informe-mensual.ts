import {
  agruparActividadesPorEquivalenciaTemporal,
  type OpcionesAgrupacionTemporal,
} from "@/lib/agrupar-actividades-temporales-informe";
import {
  consolidarFechasEjecucion,
  formatearFechaEjecucion,
} from "@/lib/formatear-fecha-informe";
import { parsearFrentesContextoTecnico } from "@/lib/parsear-frentes-contexto-tecnico";
import type { Actividad } from "@/types/actividad";
import type { ConfiguracionIAContext } from "@/types/configuracion-ia";
import type { ActividadEvidenciaConSignedUrl } from "@/types/actividad-evidencia";
import type {
  InformeMensualActividadFila,
  InformeMensualContrato,
  InformeMensualData,
  InformeMensualEvidencia,
  InformeMensualObligacion,
} from "@/types/informe-mensual";
import { resolverObligacionActividadAlmacenada } from "@/lib/clasificar-obligacion";

export { esObligacionBasura, parseObligacionesContrato } from "@/lib/clasificar-obligacion";

export const MENSAJE_OBLIGACION_SIN_ACTIVIDADES =
  "Esta obligación no aplica para el periodo del informe.";

export function calcularRangoFechas(mes: number, anio: number): {
  inicio: string;
  fin: string;
} {
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  return { inicio, fin };
}

export function formatearPeriodo(mes: number, anio: number): string {
  const fecha = new Date(anio, mes - 1, 1);

  return fecha.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
}

export function asignarActividadesAObligaciones(
  actividades: Actividad[],
  obligacionesContrato: string[]
): Map<string, Actividad[]> {
  const grupos = new Map<string, Actividad[]>(
    obligacionesContrato.map((nombre) => [nombre, []])
  );
  const actividadesAsignadas = new Set<string>();

  const actividadesOrdenadas = [...actividades].sort((a, b) => a.fecha.localeCompare(b.fecha));

  for (const actividad of actividadesOrdenadas) {
    if (actividadesAsignadas.has(actividad.id)) {
      continue;
    }

    const obligacionResuelta = resolverObligacionActividadAlmacenada(
      actividad.actividad_original,
      actividad.obligacion_detectada,
      obligacionesContrato,
      {
        tipoActividadDetectada: actividad.tipo_actividad_detectada,
        clasificacionManual: actividad.clasificacion_manual,
      }
    );

    if (!obligacionResuelta) {
      console.warn(
        `[Informe mensual] Actividad ${actividad.id}: no se pudo resolver una obligación contractual exacta.`
      );
      continue;
    }

    const grupo = grupos.get(obligacionResuelta);

    if (!grupo) {
      continue;
    }

    grupo.push(actividad);
    actividadesAsignadas.add(actividad.id);
  }

  return grupos;
}

export function mapearEvidenciasInforme(
  evidencias: ActividadEvidenciaConSignedUrl[]
): InformeMensualEvidencia[] {
  return evidencias.map((evidencia) => ({
    id: evidencia.id,
    actividad_id: evidencia.actividad_id,
    url: evidencia.url,
    nombre_archivo: evidencia.nombre_archivo,
    created_at: evidencia.created_at,
    signed_url: evidencia.signed_url,
  }));
}

export function mapearGrupoActividadesAFilaInforme(
  actividades: Actividad[],
  evidenciasPorActividad: Record<string, ActividadEvidenciaConSignedUrl[]>
): InformeMensualActividadFila {
  const actividadesOrdenadas = [...actividades].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const fechas = actividadesOrdenadas.map((actividad) => actividad.fecha);
  const evidencias = actividadesOrdenadas.flatMap((actividad) =>
    mapearEvidenciasInforme(evidenciasPorActividad[actividad.id] ?? [])
  );
  const esGrupoConsolidado = actividadesOrdenadas.length > 1;

  return {
    id: actividadesOrdenadas[0].id,
    fecha: fechas[0],
    fecha_ejecucion_etiqueta: esGrupoConsolidado
      ? consolidarFechasEjecucion(fechas)
      : formatearFechaEjecucion(fechas[0]),
    redaccion_ia: actividadesOrdenadas[0].redaccion_ia,
    actividades_origen_ids: esGrupoConsolidado
      ? actividadesOrdenadas.map((actividad) => actividad.id)
      : undefined,
    evidencias,
  };
}

export function mapearActividadAFilaInforme(
  actividad: Actividad,
  evidencias: ActividadEvidenciaConSignedUrl[]
): InformeMensualActividadFila {
  return mapearGrupoActividadesAFilaInforme([actividad], {
    [actividad.id]: evidencias,
  });
}

/** Una redacción representativa por fila consolidada (informe contratista y supervisión). */
export function obtenerRedaccionesActividadInforme(
  actividad: InformeMensualActividadFila
): string[] {
  return [actividad.redaccion_ia];
}

export function crearOpcionesAgrupacionTemporal(
  configuracion?: ConfiguracionIAContext | null
): OpcionesAgrupacionTemporal {
  const contextoTecnico = configuracion?.contexto_tecnico?.trim() ?? "";

  if (!contextoTecnico) {
    return {};
  }

  return {
    frentesContexto: parsearFrentesContextoTecnico(contextoTecnico),
  };
}

export function construirObligacionesInformeContractual(
  obligacionesContrato: string[],
  grupos: Map<string, Actividad[]>,
  evidenciasPorActividad: Record<string, ActividadEvidenciaConSignedUrl[]>,
  configuracion?: ConfiguracionIAContext | null
): InformeMensualObligacion[] {
  const opcionesAgrupacion = crearOpcionesAgrupacionTemporal(configuracion);

  return obligacionesContrato.map((nombre) => {
    const actividadesGrupo = grupos.get(nombre) ?? [];

    if (actividadesGrupo.length === 0) {
      return {
        nombre,
        actividades: [],
        mensajeSinActividades: MENSAJE_OBLIGACION_SIN_ACTIVIDADES,
      };
    }

    const actividades = agruparActividadesPorEquivalenciaTemporal(
      actividadesGrupo,
      opcionesAgrupacion
    ).map((grupo) => mapearGrupoActividadesAFilaInforme(grupo, evidenciasPorActividad));

    return {
      nombre,
      actividades,
    };
  });
}

export function construirInformeMensual({
  contrato,
  actividades,
  obligaciones,
  mes,
  anio,
}: {
  contrato: InformeMensualContrato;
  actividades: Actividad[];
  obligaciones: InformeMensualObligacion[];
  mes: number;
  anio: number;
}): InformeMensualData {
  const totalObligacionesTrabajadas = obligaciones.filter(
    (obligacion) => obligacion.actividades.length > 0
  ).length;

  return {
    contrato,
    periodo: {
      mes,
      anio,
      etiqueta: formatearPeriodo(mes, anio),
    },
    obligaciones,
    resumen: {
      totalActividades: actividades.length,
      totalObligaciones: obligaciones.length,
      totalObligacionesTrabajadas,
    },
    observacionesFinales: "",
  };
}
