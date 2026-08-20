import type { Actividad } from "@/types/actividad";
import type {
  InformeMensualContrato,
  InformeMensualData,
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

export function obtenerProyectosUnicos(actividades: Actividad[]): string[] {
  return [...new Set(actividades.map((actividad) => actividad.proyecto_detectado))]
    .filter((proyecto) => proyecto.trim() !== "")
    .sort((a, b) => a.localeCompare(b, "es"));
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
  const proyectosIdentificados = obtenerProyectosUnicos(actividades);
  const totalActividadesConsolidadas = obligaciones.reduce(
    (total, obligacion) => total + obligacion.actividadesConsolidadas.length,
    0
  );
  const totalObligacionesTrabajadas = obligaciones.filter(
    (obligacion) => obligacion.actividadesConsolidadas.length > 0
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
      totalActividadesConsolidadas,
      totalObligaciones: obligaciones.length,
      totalObligacionesTrabajadas,
      totalProyectos: proyectosIdentificados.length,
      proyectosIdentificados,
    },
    observacionesFinales: "",
  };
}
