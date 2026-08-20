"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { corregirClasificacionActividad } from "@/app/(dashboard)/auditoria-obligaciones/actions";
import { obtenerIndicadorClasificacion } from "@/lib/estado-clasificacion";
import type { Actividad } from "@/types/actividad";

type AuditoriaObligacionesProps = {
  actividades: Actividad[];
  obligacionesContrato: string[];
};

type FormularioCorreccion = {
  obligacion_detectada: string;
  proyecto_detectado: string;
  tipo_actividad_detectada: string;
};

const TODOS_MESES = "todos";
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

function crearFormularioDesdeActividad(actividad: Actividad): FormularioCorreccion {
  return {
    obligacion_detectada: actividad.obligacion_detectada,
    proyecto_detectado: actividad.proyecto_detectado,
    tipo_actividad_detectada: actividad.tipo_actividad_detectada ?? "",
  };
}

export default function AuditoriaObligaciones({
  actividades,
  obligacionesContrato,
}: AuditoriaObligacionesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mes, setMes] = useState(TODOS_MESES);
  const [obligacion, setObligacion] = useState(TODAS_OBLIGACIONES);
  const [actividadEnEdicionId, setActividadEnEdicionId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<FormularioCorreccion | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const mesesDisponibles = useMemo(
    () =>
      getUniqueSorted(
        actividades.map((actividad) => actividad.fecha.slice(0, 7))
      ),
    [actividades]
  );

  const obligacionesDisponibles = useMemo(
    () =>
      getUniqueSorted(actividades.map((actividad) => actividad.obligacion_detectada)),
    [actividades]
  );

  const proyectosDisponibles = useMemo(
    () => getUniqueSorted(actividades.map((actividad) => actividad.proyecto_detectado)),
    [actividades]
  );

  const tiposActividadDisponibles = useMemo(
    () =>
      getUniqueSorted(
        actividades.map((actividad) => actividad.tipo_actividad_detectada ?? "")
      ),
    [actividades]
  );

  const actividadesFiltradas = useMemo(() => {
    return actividades.filter((actividad) => {
      const coincideMes =
        mes === TODOS_MESES || actividad.fecha.slice(0, 7) === mes;
      const coincideObligacion =
        obligacion === TODAS_OBLIGACIONES ||
        actividad.obligacion_detectada === obligacion;

      return coincideMes && coincideObligacion;
    });
  }, [actividades, mes, obligacion]);

  function iniciarCorreccion(actividad: Actividad) {
    setActividadEnEdicionId(actividad.id);
    setFormulario(crearFormularioDesdeActividad(actividad));
    setMensajeError(null);
    setMensajeExito(null);
  }

  function cancelarCorreccion() {
    setActividadEnEdicionId(null);
    setFormulario(null);
    setMensajeError(null);
  }

  function actualizarCampo(campo: keyof FormularioCorreccion, valor: string) {
    setFormulario((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  function guardarCorreccion(actividadId: string) {
    if (!formulario) {
      return;
    }

    setMensajeError(null);
    setMensajeExito(null);

    startTransition(async () => {
      const resultado = await corregirClasificacionActividad({
        actividadId,
        ...formulario,
      });

      if (!resultado.success) {
        setMensajeError(resultado.error);
        return;
      }

      setActividadEnEdicionId(null);
      setFormulario(null);
      setMensajeExito("Corrección guardada. La clasificación manual tiene prioridad.");
      router.refresh();
    });
  }

  if (actividades.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No hay actividades registradas para auditar la clasificación contractual.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <p>
          Revisa la clasificación y corrige obligación, proyecto o tipo de actividad cuando
          sea necesario. Las correcciones manuales quedan marcadas como{" "}
          <span aria-hidden="true">🟢</span> y no se sobrescriben al generar informes.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          🟢 correcta (≥70 o manual) · 🟡 revisar (40–69) · 🔴 sospechosa (&lt;40)
        </p>
      </div>

      {mensajeExito ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {mensajeExito}
        </p>
      ) : null}

      {mensajeError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mensajeError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="auditoria-mes" className="block text-sm font-medium text-zinc-700">
            Mes
          </label>
          <select
            id="auditoria-mes"
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
            htmlFor="auditoria-obligacion"
            className="block text-sm font-medium text-zinc-700"
          >
            Obligación detectada
          </label>
          <select
            id="auditoria-obligacion"
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

      <p className="text-sm text-zinc-600">
        Mostrando {actividadesFiltradas.length} de {actividades.length} actividades.
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">
                Actividad original
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">
                Tipo de actividad
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">
                Obligación detectada
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">
                Proyecto detectado
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {actividadesFiltradas.map((actividad) => {
              const indicador = obtenerIndicadorClasificacion(
                actividad.puntaje_clasificacion,
                actividad.clasificacion_manual
              );
              const enEdicion = actividadEnEdicionId === actividad.id;

              return (
                <Fragment key={actividad.id}>
                  <tr className="align-top">
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={`${indicador.etiqueta} (${actividad.puntaje_clasificacion})`}
                      >
                        <span aria-hidden="true">{indicador.emoji}</span>
                        <span className="text-zinc-700">{indicador.etiqueta}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-zinc-700">
                      {formatFecha(actividad.fecha)}
                    </td>
                    <td className="max-w-md px-4 py-4 text-zinc-900">
                      {actividad.actividad_original}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-zinc-800">
                      {actividad.tipo_actividad_detectada?.trim() || "—"}
                    </td>
                    <td className="max-w-sm px-4 py-4 text-zinc-800">
                      {actividad.obligacion_detectada}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-zinc-800">
                      {actividad.proyecto_detectado}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {enEdicion ? (
                        <button
                          type="button"
                          onClick={cancelarCorreccion}
                          disabled={isPending}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => iniciarCorreccion(actividad)}
                          disabled={isPending || obligacionesContrato.length === 0}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                        >
                          Corregir
                        </button>
                      )}
                    </td>
                  </tr>

                  {enEdicion && formulario ? (
                    <tr className="bg-amber-50/40">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-4 rounded-xl border border-amber-200 bg-white p-4">
                          <p className="text-sm font-medium text-zinc-900">
                            Corrección manual de clasificación
                          </p>

                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2">
                              <label
                                htmlFor={`tipo-${actividad.id}`}
                                className="block text-xs font-medium text-zinc-700"
                              >
                                Tipo de actividad detectada
                              </label>
                              <input
                                id={`tipo-${actividad.id}`}
                                list={`tipos-${actividad.id}`}
                                value={formulario.tipo_actividad_detectada}
                                onChange={(event) =>
                                  actualizarCampo(
                                    "tipo_actividad_detectada",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              />
                              <datalist id={`tipos-${actividad.id}`}>
                                {tiposActividadDisponibles.map((tipo) => (
                                  <option key={tipo} value={tipo} />
                                ))}
                              </datalist>
                            </div>

                            <div className="space-y-2">
                              <label
                                htmlFor={`obligacion-${actividad.id}`}
                                className="block text-xs font-medium text-zinc-700"
                              >
                                Obligación detectada
                              </label>
                              <select
                                id={`obligacion-${actividad.id}`}
                                value={formulario.obligacion_detectada}
                                onChange={(event) =>
                                  actualizarCampo("obligacion_detectada", event.target.value)
                                }
                                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              >
                                {obligacionesContrato.map((obligacionContrato) => (
                                  <option key={obligacionContrato} value={obligacionContrato}>
                                    {obligacionContrato}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label
                                htmlFor={`proyecto-${actividad.id}`}
                                className="block text-xs font-medium text-zinc-700"
                              >
                                Proyecto detectado
                              </label>
                              <input
                                id={`proyecto-${actividad.id}`}
                                list={`proyectos-${actividad.id}`}
                                value={formulario.proyecto_detectado}
                                onChange={(event) =>
                                  actualizarCampo("proyecto_detectado", event.target.value)
                                }
                                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              />
                              <datalist id={`proyectos-${actividad.id}`}>
                                {proyectosDisponibles.map((proyecto) => (
                                  <option key={proyecto} value={proyecto} />
                                ))}
                              </datalist>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => guardarCorreccion(actividad.id)}
                              disabled={isPending}
                              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                            >
                              {isPending ? "Guardando..." : "Guardar corrección"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelarCorreccion}
                              disabled={isPending}
                              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {obligacionesContrato.length === 0 ? (
        <p className="text-sm text-amber-800">
          Configura las obligaciones del contrato activo para habilitar correcciones manuales.
        </p>
      ) : null}
    </div>
  );
}
