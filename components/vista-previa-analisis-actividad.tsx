"use client";

import type { AnalisisActividadResult } from "@/types/analisis-actividad";

type VistaPreviaAnalisisActividadProps = {
  analisis: AnalisisActividadResult;
  analizando: boolean;
  guardando: boolean;
  onReanalizar: () => void;
  onGuardar: () => void;
  onEditar: () => void;
};

function CampoVistaPrevia({
  titulo,
  contenido,
  multiline = false,
}: {
  titulo: string;
  contenido: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-700">{titulo}</h3>
      <p
        className={`text-sm text-zinc-600 ${multiline ? "leading-7 whitespace-pre-wrap" : ""}`}
      >
        {contenido}
      </p>
    </div>
  );
}

export default function VistaPreviaAnalisisActividad({
  analisis,
  analizando,
  guardando,
  onReanalizar,
  onGuardar,
  onEditar,
}: VistaPreviaAnalisisActividadProps) {
  const deshabilitado = analizando || guardando;

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
      <header className="space-y-2 border-b border-zinc-200 pb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Vista previa del análisis IA</h2>
        <p className="text-sm leading-6 text-zinc-600">
          Revisa el resultado antes de registrar la actividad.{" "}
          <span className="font-medium text-zinc-700">Reanalizar</span> genera otra
          formulación de resumen y redacción, manteniendo la misma clasificación.
        </p>
      </header>

      <div className="space-y-5">
        <CampoVistaPrevia titulo="Resumen IA" contenido={analisis.resumen_ia} multiline />
        <CampoVistaPrevia
          titulo="Obligación detectada"
          contenido={analisis.obligacion_detectada}
          multiline
        />
        <CampoVistaPrevia titulo="Proyecto detectado" contenido={analisis.proyecto_detectado} />
        <CampoVistaPrevia titulo="Redacción IA" contenido={analisis.redaccion_ia} multiline />
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onReanalizar}
          disabled={deshabilitado}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {analizando ? "Generando otra redacción..." : "Reanalizar"}
        </button>

        <button
          type="button"
          onClick={onGuardar}
          disabled={deshabilitado}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? "Guardando actividad..." : "Guardar actividad"}
        </button>

        <button
          type="button"
          onClick={onEditar}
          disabled={deshabilitado}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Volver a editar
        </button>
      </div>
    </section>
  );
}
