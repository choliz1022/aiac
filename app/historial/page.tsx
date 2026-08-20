import HistorialActividades from "@/components/historial-actividades";
import Link from "next/link";
import { AUDITORIA_OBLIGACIONES_HREF } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import type { Actividad } from "@/types/actividad";

async function getActividades(): Promise<{
  actividades: Actividad[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("actividades")
      .select(
        "id, contrato_id, fecha, actividad_original, tipo_actividad_detectada, proyecto_detectado, obligacion_detectada, clasificacion_manual, puntaje_clasificacion, redaccion_ia, resumen_ia, palabras_clave, created_at"
      )
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error al consultar actividades:", error);
      return { actividades: [], error: error.message };
    }

    return {
      actividades: (data ?? []).map((actividad) => ({
        ...actividad,
        clasificacion_manual: actividad.clasificacion_manual ?? false,
        puntaje_clasificacion: actividad.puntaje_clasificacion ?? 0,
      })),
      error: null,
    };
  } catch (error) {
    console.error("Error al consultar actividades:", error);
    return {
      actividades: [],
      error: "No se pudieron cargar las actividades.",
    };
  }
}

export default async function HistorialPage() {
  const { actividades, error } = await getActividades();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Historial</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Consulta las actividades registradas y revisa el análisis generado por IA.
          </p>
        </div>
        <Link
          href={AUDITORIA_OBLIGACIONES_HREF}
          className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
        >
          Auditoría de obligaciones
        </Link>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <HistorialActividades actividades={actividades} />
        )}
      </section>
    </div>
  );
}
