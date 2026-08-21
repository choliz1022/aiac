"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EVIDENCIAS_MAX_ARCHIVOS,
  EVIDENCIAS_MAX_BYTES,
  formatearIndicadorEvidencias,
  validarArchivoEvidencia,
} from "@/lib/evidencias";

type EvidenciaPendiente = {
  id: string;
  file: File;
  previewUrl: string;
};

type EvidenciasActividadInputProps = {
  archivos: File[];
  onChange: (archivos: File[]) => void;
  disabled?: boolean;
  variant?: "default" | "sidebar";
  existentesCount?: number;
};

function crearIdPendiente(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function EvidenciasActividadInput({
  archivos,
  onChange,
  disabled = false,
  variant = "default",
  existentesCount = 0,
}: EvidenciasActividadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendientes, setPendientes] = useState<EvidenciaPendiente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const esSidebar = variant === "sidebar";

  useEffect(() => {
    return () => {
      pendientes.forEach((pendiente) => URL.revokeObjectURL(pendiente.previewUrl));
    };
  }, [pendientes]);

  useEffect(() => {
    if (archivos.length === 0 && pendientes.length > 0) {
      pendientes.forEach((pendiente) => URL.revokeObjectURL(pendiente.previewUrl));
      setPendientes([]);
    }
  }, [archivos.length, pendientes]);

  const totalActual = existentesCount + archivos.length;
  const indicador = useMemo(
    () =>
      existentesCount > 0
        ? `${existentesCount + archivos.length} / ${EVIDENCIAS_MAX_ARCHIVOS} imágenes`
        : formatearIndicadorEvidencias(archivos.length),
    [archivos.length, existentesCount]
  );

  function sincronizarArchivos(nuevosPendientes: EvidenciaPendiente[]) {
    setPendientes(nuevosPendientes);
    onChange(nuevosPendientes.map((pendiente) => pendiente.file));
  }

  function handleSeleccion(event: React.ChangeEvent<HTMLInputElement>) {
    const seleccionados = Array.from(event.target.files ?? []);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (seleccionados.length === 0) {
      return;
    }

    if (totalActual + seleccionados.length > EVIDENCIAS_MAX_ARCHIVOS) {
      setError(`Puedes adjuntar hasta ${EVIDENCIAS_MAX_ARCHIVOS} imágenes por actividad.`);
      return;
    }

    for (const file of seleccionados) {
      const validationError = validarArchivoEvidencia(file);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError(null);

    const nuevos = seleccionados.map((file) => ({
      id: crearIdPendiente(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    sincronizarArchivos([...pendientes, ...nuevos]);
  }

  function eliminarPendiente(id: string) {
    const pendiente = pendientes.find((item) => item.id === id);

    if (pendiente) {
      URL.revokeObjectURL(pendiente.previewUrl);
    }

    sincronizarArchivos(pendientes.filter((item) => item.id !== id));
    setError(null);
  }

  return (
    <div
      className={`flex h-full flex-col ${esSidebar ? "rounded-xl border border-zinc-200 bg-zinc-50/70 p-4" : "space-y-4"}`}
    >
      <div
        className={
          esSidebar
            ? "mb-3 flex items-start justify-between gap-2"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div>
          <p className="text-sm font-medium text-zinc-700">Evidencias</p>
          {!esSidebar ? (
            <p className="mt-1 text-sm text-zinc-500">
              Adjunta fotografías de respaldo. Máximo {EVIDENCIAS_MAX_ARCHIVOS} imágenes de{" "}
              {Math.round(EVIDENCIAS_MAX_BYTES / (1024 * 1024))} MB cada una.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Hasta {EVIDENCIAS_MAX_ARCHIVOS} fotos · {Math.round(EVIDENCIAS_MAX_BYTES / (1024 * 1024))} MB c/u
            </p>
          )}
        </div>
        <p className={`shrink-0 text-zinc-600 ${esSidebar ? "text-xs" : "text-sm"}`}>
          {indicador}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled || totalActual >= EVIDENCIAS_MAX_ARCHIVOS}
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded-lg border border-zinc-300 bg-white font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 ${
          esSidebar ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        Subir imágenes
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleSeleccion}
        disabled={disabled}
      />

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className={`min-h-0 flex-1 ${esSidebar ? "mt-3" : "mt-4"}`}>
        {pendientes.length > 0 ? (
          <div
            className={
              esSidebar
                ? "grid max-h-[min(420px,50vh)] grid-cols-2 gap-2 overflow-y-auto pr-1"
                : "grid grid-cols-2 gap-4 sm:grid-cols-3"
            }
          >
            {pendientes.map((pendiente) => (
              <div
                key={pendiente.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendiente.previewUrl}
                  alt={pendiente.file.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="flex items-center justify-between gap-1 px-1.5 py-1.5">
                  <p className="truncate text-[10px] text-zinc-600">{pendiente.file.name}</p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => eliminarPendiente(pendiente.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p
            className={`rounded-lg border border-dashed border-zinc-300 text-center text-zinc-500 ${
              esSidebar
                ? "flex min-h-[180px] items-center justify-center px-3 py-4 text-xs leading-5"
                : "px-4 py-6 text-sm"
            }`}
          >
            {esSidebar
              ? "Las miniaturas aparecerán aquí al seleccionar fotos."
              : "Aún no has seleccionado evidencias fotográficas."}
          </p>
        )}
      </div>
    </div>
  );
}
