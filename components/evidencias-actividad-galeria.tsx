"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { listarEvidenciasActividad } from "@/app/(dashboard)/evidencias/actions";
import { formatearIndicadorEvidencias } from "@/lib/evidencias";
import type { ActividadEvidenciaConSignedUrl } from "@/types/actividad-evidencia";

type EvidenciasActividadGaleriaProps = {
  actividadId: string;
  cantidad?: number;
  compacto?: boolean;
  autoCargar?: boolean;
};

export default function EvidenciasActividadGaleria({
  actividadId,
  cantidad = 0,
  compacto = false,
  autoCargar = false,
}: EvidenciasActividadGaleriaProps) {
  const [isPending, startTransition] = useTransition();
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<ActividadEvidenciaConSignedUrl[]>([]);

  const indicador = useMemo(
    () => formatearIndicadorEvidencias(cantidad > 0 ? cantidad : evidencias.length),
    [cantidad, evidencias.length]
  );

  useEffect(() => {
    setCargado(false);
    setError(null);
    setEvidencias([]);
  }, [actividadId]);

  function cargarEvidencias() {
    if (cargado || isPending) {
      return;
    }

    startTransition(async () => {
      const resultado = await listarEvidenciasActividad(actividadId);

      if (!resultado.success) {
        setError(resultado.error);
        setCargado(true);
        return;
      }

      setEvidencias(resultado.evidencias);
      setCargado(true);
    });
  }

  useEffect(() => {
    if (autoCargar && cantidad > 0) {
      cargarEvidencias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCargar, cantidad, actividadId]);

  if (cantidad === 0 && !cargado) {
    return (
      <p className="text-sm text-zinc-600">{formatearIndicadorEvidencias(0)}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-zinc-700">{indicador}</p>

        {!cargado && !autoCargar ? (
          <button
            type="button"
            onClick={cargarEvidencias}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? "Cargando..." : "Ver evidencias"}
          </button>
        ) : null}

        {isPending ? (
          <span className="text-xs text-zinc-500">Cargando imágenes...</span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {cargado && evidencias.length > 0 ? (
        <div
          className={
            compacto
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
              : "grid grid-cols-2 gap-4 sm:grid-cols-3"
          }
        >
          {evidencias.map((evidencia) => (
            <a
              key={evidencia.id}
              href={evidencia.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidencia.signed_url}
                alt={evidencia.nombre_archivo}
                className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
              />
              <p className="truncate px-2 py-1.5 text-xs text-zinc-600">
                {evidencia.nombre_archivo}
              </p>
            </a>
          ))}
        </div>
      ) : null}

      {cargado && evidencias.length === 0 && cantidad > 0 ? (
        <p className="text-sm text-zinc-600">No se pudieron mostrar las imágenes.</p>
      ) : null}
    </div>
  );
}
