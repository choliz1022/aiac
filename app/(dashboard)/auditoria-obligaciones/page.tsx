import Link from "next/link";
import AuditoriaObligaciones from "@/components/auditoria-obligaciones";
import {
  calcularPuntajeClasificacionAlmacenada,
  parseObligacionesContrato,
} from "@/lib/clasificar-obligacion";
import { getContratoActivo } from "@/lib/contrato-activo";
import { normalizarConteoEvidenciasRelacion } from "@/lib/evidencias";
import { createClient } from "@/lib/supabase/server";
import type { Actividad } from "@/types/actividad";

const CAMPOS_ACTIVIDAD = [
  "id",
  "contrato_id",
  "fecha",
  "actividad_original",
  "tipo_actividad_detectada",
  "proyecto_detectado",
  "obligacion_detectada",
  "clasificacion_manual",
  "puntaje_clasificacion",
  "redaccion_ia",
  "resumen_ia",
  "palabras_clave",
  "created_at",
  "actividad_evidencias(count)",
].join(", ");

type ActividadConRelacionEvidencias = Actividad & {
  actividad_evidencias?: { count: number }[];
};

function normalizarActividad(
  actividad: Actividad,
  obligacionesTexto: string | null
): Actividad {
  const clasificacionManual = actividad.clasificacion_manual ?? false;
  let puntajeClasificacion = actividad.puntaje_clasificacion ?? 0;

  if (clasificacionManual) {
    puntajeClasificacion = 100;
  } else if (puntajeClasificacion <= 0 && obligacionesTexto) {
    puntajeClasificacion = calcularPuntajeClasificacionAlmacenada({
      actividadOriginal: actividad.actividad_original,
      obligacionDetectada: actividad.obligacion_detectada,
      obligacionesTexto,
      tipoActividadDetectada: actividad.tipo_actividad_detectada,
    });
  }

  return {
    ...actividad,
    clasificacion_manual: clasificacionManual,
    puntaje_clasificacion: puntajeClasificacion,
  };
}

async function getContratoObligaciones(): Promise<string | null> {
  const contrato = await getContratoActivo();

  if (!contrato?.obligaciones?.trim()) {
    return null;
  }

  return contrato.obligaciones;
}

async function getActividades(): Promise<{
  actividades: Actividad[];
  obligacionesContrato: string[];
  error: string | null;
}> {
  try {
    const contrato = await getContratoActivo();
    const obligacionesTexto = await getContratoObligaciones();
    const obligacionesContrato = obligacionesTexto
      ? parseObligacionesContrato(obligacionesTexto)
      : [];

    if (!contrato) {
      return { actividades: [], obligacionesContrato, error: null };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("actividades")
      .select(CAMPOS_ACTIVIDAD)
      .eq("contrato_id", contrato.id)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error al consultar actividades para auditoría:", error);
      return { actividades: [], obligacionesContrato, error: error.message };
    }

    const actividades = (data ?? []).map((actividad) => {
      const registro = actividad as unknown as ActividadConRelacionEvidencias;

      return normalizarActividad(
        {
          ...registro,
          evidencias_count: normalizarConteoEvidenciasRelacion(registro.actividad_evidencias),
        },
        obligacionesTexto
      );
    });

    return { actividades, obligacionesContrato, error: null };
  } catch (error) {
    console.error("Error al consultar actividades para auditoría:", error);
    return {
      actividades: [],
      obligacionesContrato: [],
      error: "No se pudieron cargar las actividades.",
    };
  }
}

export default async function AuditoriaObligacionesPage() {
  const { actividades, obligacionesContrato, error } = await getActividades();

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="text-sm text-zinc-500">
          <Link href="/historial" className="hover:text-zinc-800">
            Historial
          </Link>
          <span className="mx-2">/</span>
          <span>Auditoría</span>
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          Auditoría de obligaciones
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Inspecciona y corrige la clasificación contractual. Las correcciones manuales
          tienen prioridad sobre futuras reclasificaciones automáticas.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <AuditoriaObligaciones
            actividades={actividades}
            obligacionesContrato={obligacionesContrato}
          />
        )}
      </section>
    </div>
  );
}
