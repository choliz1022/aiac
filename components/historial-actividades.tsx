"use client";

import { useEffect, useMemo, useState } from "react";
import type { Actividad } from "@/types/actividad";

type HistorialActividadesProps = {
  actividades: Actividad[];
};

const TODOS_MESES = "todos";
const TODOS_PROYECTOS = "todos";
const TODAS_OBLIGACIONES = "todas";

function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split("-");

  if (!year || !month || !day) {
    return fecha;
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMesLabel(mes: string): string {
  const [year, month] = mes.split("-");

  if (!year || !month) {
    return mes;
  }

  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
  });
}

function getUniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

function normalizePalabrasClave(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is string => typeof item === "string" && item.trim() !== ""
          );
        }
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  console.warn("[Historial] palabras_clave con formato inesperado:", value);
  return [];
}

export default function HistorialActividades({
  actividades: actividadesProp,
}: HistorialActividadesProps) {
  const [mes, setMes] = useState(TODOS_MESES);
  const [proyecto, setProyecto] = useState(TODOS_PROYECTOS);
  const [obligacion, setObligacion] = useState(TODAS_OBLIGACIONES);
  const [seleccionada, setSeleccionada] = useState<Actividad | null>(null);

  const actividades = useMemo(
    () =>
      actividadesProp.map((actividad) => ({
        ...actividad,
        palabras_clave: normalizePalabrasClave(actividad.palabras_clave),
      })),
    [actividadesProp]
  );

  useEffect(() => {
    actividadesProp.forEach((actividad) => {
      const raw = actividad.palabras_clave as unknown;

      if (raw != null && !Array.isArray(raw)) {
        console.warn("[Historial] palabras_clave no es array:", {
          id: actividad.id,
          tipo: typeof raw,
          valor: raw,
        });
      }
    });
  }, [actividadesProp]);

  const palabrasClaveSeleccionadas = useMemo(
    () => normalizePalabrasClave(seleccionada?.palabras_clave),
    [seleccionada]
  );

  const mesesDisponibles = useMemo(() => {
    const meses = actividades.map((actividad) => actividad.fecha.slice(0, 7));
    return getUniqueSorted(meses).sort((a, b) => b.localeCompare(a));
  }, [actividades]);

  const proyectosDisponibles = useMemo(
    () => getUniqueSorted(actividades.map((actividad) => actividad.proyecto_detectado)),
    [actividades]
  );

  const obligacionesDisponibles = useMemo(
    () =>
      getUniqueSorted(actividades.map((actividad) => actividad.obligacion_detectada)),
    [actividades]
  );

  const actividadesFiltradas = useMemo(() => {
    return actividades.filter((actividad) => {
      const matchMes = mes === TODOS_MESES || actividad.fecha.startsWith(mes);
      const matchProyecto =
        proyecto === TODOS_PROYECTOS || actividad.proyecto_detectado === proyecto;
      const matchObligacion =
        obligacion === TODAS_OBLIGACIONES ||
        actividad.obligacion_detectada === obligacion;

      return matchMes && matchProyecto && matchObligacion;
    });
  }, [actividades, mes, obligacion, proyecto]);

  if (actividades.length === 0) {
    return (
      <p className="text-sm text-zinc-600">Aún no hay actividades registradas.</p>
    );
  }

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="filtro-mes" className="block text-sm font-medium text-zinc-700">
              Mes
            </label>
            <select
              id="filtro-mes"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value={TODOS_MESES}>Todos los meses</option>
              {mesesDisponibles.map((mesOption) => (
                <option key={mesOption} value={mesOption}>
                  {formatMesLabel(mesOption)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="filtro-proyecto"
              className="block text-sm font-medium text-zinc-700"
            >
              Proyecto detectado
            </label>
            <select
              id="filtro-proyecto"
              value={proyecto}
              onChange={(event) => setProyecto(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value={TODOS_PROYECTOS}>Todos los proyectos</option>
              {proyectosDisponibles.map((proyectoOption) => (
                <option key={proyectoOption} value={proyectoOption}>
                  {proyectoOption}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="filtro-obligacion"
              className="block text-sm font-medium text-zinc-700"
            >
              Obligación detectada
            </label>
            <select
              id="filtro-obligacion"
              value={obligacion}
              onChange={(event) => setObligacion(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value={TODAS_OBLIGACIONES}>Todas las obligaciones</option>
              {obligacionesDisponibles.map((obligacionOption) => (
                <option key={obligacionOption} value={obligacionOption}>
                  {obligacionOption}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-zinc-500">
          Mostrando {actividadesFiltradas.length} de {actividades.length} actividades
        </p>
      </div>

      {actividadesFiltradas.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No hay actividades que coincidan con los filtros seleccionados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Proyecto detectado</th>
                <th className="px-4 py-3">Obligación detectada</th>
                <th className="px-4 py-3">Resumen IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {actividadesFiltradas.map((actividad) => {
                const isSelected = seleccionada?.id === actividad.id;

                return (
                  <tr
                    key={actividad.id}
                    onClick={() => setSeleccionada(actividad)}
                    className={`cursor-pointer text-sm transition hover:bg-zinc-50 ${
                      isSelected ? "bg-zinc-100" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-zinc-900">
                      {formatFecha(actividad.fecha)}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-zinc-700">
                      <p className="line-clamp-2">{actividad.proyecto_detectado}</p>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-zinc-700">
                      <p className="line-clamp-2">{actividad.obligacion_detectada}</p>
                    </td>
                    <td className="max-w-md px-4 py-4 text-zinc-700">
                      <p className="line-clamp-2">{actividad.resumen_ia}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar panel"
            onClick={() => setSeleccionada(null)}
            className="absolute inset-0 bg-zinc-900/30"
          />

          <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Detalle de actividad</h2>
              <button
                type="button"
                onClick={() => setSeleccionada(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <DetalleSeccion titulo="Fecha" contenido={formatFecha(seleccionada.fecha)} />

              <DetalleSeccion
                titulo="Proyecto detectado"
                contenido={seleccionada.proyecto_detectado}
              />

              <DetalleSeccion
                titulo="Obligación detectada"
                contenido={seleccionada.obligacion_detectada}
              />

              <DetalleSeccion
                titulo="Actividad original"
                contenido={seleccionada.actividad_original}
                multiline
              />

              <DetalleSeccion titulo="Resumen IA" contenido={seleccionada.resumen_ia} multiline />

              <DetalleSeccion
                titulo="Redacción IA"
                contenido={seleccionada.redaccion_ia}
                multiline
              />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-700">Palabras clave</h3>
                {palabrasClaveSeleccionadas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {palabrasClaveSeleccionadas.map((palabra) => (
                      <span
                        key={palabra}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                      >
                        {palabra}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-zinc-600">Sin palabras clave.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

type DetalleSeccionProps = {
  titulo: string;
  contenido: string;
  multiline?: boolean;
};

function DetalleSeccion({ titulo, contenido, multiline = false }: DetalleSeccionProps) {
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
