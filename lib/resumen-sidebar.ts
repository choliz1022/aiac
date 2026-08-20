import { esObligacionBasura } from "@/lib/clasificar-obligacion";
import { getPeriodoActual } from "@/lib/contrato-activo";
import { calcularRangoFechas } from "@/lib/informe-mensual";
import { createClient } from "@/lib/supabase/server";

export type ResumenSidebar = {
  periodoActual: string;
  totalActividadesPeriodo: number;
  obligacionesConActividad: number;
  ultimaActividadFecha: string | null;
  ultimaActividadResumen: string | null;
  informeMensualGenerado: boolean;
  disponible: boolean;
};

function formatFechaCorta(fecha: string): string {
  const [year, month, day] = fecha.split("-");

  if (!year || !month || !day) {
    return fecha;
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resumirTexto(texto: string, maximo = 72): string {
  const limpio = texto.trim();

  if (limpio.length <= maximo) {
    return limpio;
  }

  return `${limpio.slice(0, maximo - 3)}...`;
}

export async function getResumenSidebar(): Promise<ResumenSidebar> {
  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();
  const periodoActual = getPeriodoActual();
  const { inicio, fin } = calcularRangoFechas(mes, anio);

  const resumenVacío: ResumenSidebar = {
    periodoActual,
    totalActividadesPeriodo: 0,
    obligacionesConActividad: 0,
    ultimaActividadFecha: null,
    ultimaActividadResumen: null,
    informeMensualGenerado: false,
    disponible: false,
  };

  try {
    const supabase = await createClient();
    const [{ data: actividadesPeriodo, error: errorPeriodo }, { data: ultimaActividad, error: errorUltima }] =
      await Promise.all([
        supabase
          .from("actividades")
          .select("obligacion_detectada")
          .gte("fecha", inicio)
          .lte("fecha", fin),
        supabase
          .from("actividades")
          .select("fecha, actividad_original")
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (errorPeriodo || errorUltima) {
      console.error("Error al consultar resumen del sidebar:", errorPeriodo ?? errorUltima);
      return resumenVacío;
    }

    const obligaciones = new Set(
      (actividadesPeriodo ?? [])
        .map((actividad) => actividad.obligacion_detectada)
        .filter(
          (obligacion): obligacion is string =>
            typeof obligacion === "string" &&
            obligacion.trim() !== "" &&
            !esObligacionBasura(obligacion)
        )
    );

    const totalActividadesPeriodo = actividadesPeriodo?.length ?? 0;

    return {
      periodoActual,
      totalActividadesPeriodo,
      obligacionesConActividad: obligaciones.size,
      ultimaActividadFecha: ultimaActividad?.fecha
        ? formatFechaCorta(ultimaActividad.fecha)
        : null,
      ultimaActividadResumen: ultimaActividad?.actividad_original
        ? resumirTexto(ultimaActividad.actividad_original)
        : null,
      informeMensualGenerado: totalActividadesPeriodo > 0,
      disponible: true,
    };
  } catch (error) {
    console.error("Error al construir resumen del sidebar:", error);
    return resumenVacío;
  }
}
