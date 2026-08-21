"use client";

import { useEffect, useState, useTransition } from "react";
import {
  eliminarEvidenciaActividad,
} from "@/app/(dashboard)/historial/actions";
import { listarEvidenciasActividad } from "@/app/(dashboard)/evidencias/actions";
import EvidenciasActividadInput from "@/components/evidencias-actividad-input";
import { formatearIndicadorEvidencias } from "@/lib/evidencias";
import type { ActividadEvidenciaConSignedUrl } from "@/types/actividad-evidencia";

type EvidenciasActividadEditorProps = {
  actividadId: string;
  evidenciasCount: number;
  nuevasEvidencias: File[];
  onNuevasEvidenciasChange: (archivos: File[]) => void;
  onEvidenciasCountChange: (count: number) => void;
  disabled?: boolean;
};

export default function EvidenciasActividadEditor({
  actividadId,
  evidenciasCount,
  nuevasEvidencias,
  onNuevasEvidenciasChange,
  onEvidenciasCountChange,
  disabled = false,
}: EvidenciasActividadEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<ActividadEvidenciaConSignedUrl[]>([]);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    setCargado(false);
    setError(null);
    setMensaje(null);
    setEvidencias([]);
  }, [actividadId]);

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actividadId]);

  function eliminarEvidencia(evidencia: ActividadEvidenciaConSignedUrl) {
    if (disabled || isPending) {
      return;
    }

    setEliminandoId(evidencia.id);
    setError(null);
    setMensaje(null);

    startTransition(async () => {
      const resultado = await eliminarEvidenciaActividad({
        actividadId,
        evidenciaId: evidencia.id,
      });

      setEliminandoId(null);

      if (!resultado.success) {
        setError(resultado.error);
        return;
      }

      setEvidencias((prev) => prev.filter((item) => item.id !== evidencia.id));
      onEvidenciasCountChange(Math.max(0, evidencias.length - 1));
      setMensaje("Evidencia eliminada correctamente.");
    });
  }

  const existentesVisibles = evidencias.length;
  const totalEfectivo =
    evidenciasCount > existentesVisibles ? evidenciasCount : existentesVisibles;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-700">Evidencias actuales</h3>
        <p className="text-xs text-zinc-500">
          {formatearIndicadorEvidencias(totalEfectivo)} · Puedes eliminar imágenes individualmente.
        </p>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {mensaje ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {mensaje}
          </p>
        ) : null}

        {!cargado && isPending ? (
          <p className="text-sm text-zinc-500">Cargando evidencias...</p>
        ) : null}

        {cargado && evidencias.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {evidencias.map((evidencia) => (
              <div
                key={evidencia.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={evidencia.signed_url}
                  alt={evidencia.nombre_archivo}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <p className="truncate text-xs text-zinc-600">{evidencia.nombre_archivo}</p>
                  <button
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => eliminarEvidencia(evidencia)}
                    className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {eliminandoId === evidencia.id ? "..." : "Eliminar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {cargado && evidencias.length === 0 ? (
          <p className="text-sm text-zinc-600">{formatearIndicadorEvidencias(0)}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-700">Agregar evidencias</h3>
        <EvidenciasActividadInput
          archivos={nuevasEvidencias}
          onChange={onNuevasEvidenciasChange}
          disabled={disabled || isPending}
          existentesCount={evidenciasCount}
          variant="sidebar"
        />
      </div>
    </div>
  );
}
