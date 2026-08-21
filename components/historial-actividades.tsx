"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  actualizarActividad,
  eliminarActividad,
  guardarEvidenciasActividad,
} from "@/app/(dashboard)/historial/actions";
import ConfirmarAccionModal from "@/components/confirmar-accion-modal";
import EvidenciasActividadEditor from "@/components/evidencias-actividad-editor";
import EvidenciasActividadGaleria from "@/components/evidencias-actividad-galeria";
import { formatearIndicadorEvidencias } from "@/lib/evidencias";
import {
  eliminarEvidenciasStorage,
  subirEvidenciasAlStorage,
} from "@/lib/evidencias-client";
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

function normalizarActividades(actividades: Actividad[]): Actividad[] {
  return actividades.map((actividad) => ({
    ...actividad,
    palabras_clave: normalizePalabrasClave(actividad.palabras_clave),
  }));
}

export default function HistorialActividades({
  actividades: actividadesProp,
}: HistorialActividadesProps) {
  const [isPending, startTransition] = useTransition();
  const [mes, setMes] = useState(TODOS_MESES);
  const [proyecto, setProyecto] = useState(TODOS_PROYECTOS);
  const [obligacion, setObligacion] = useState(TODAS_OBLIGACIONES);
  const [seleccionada, setSeleccionada] = useState<Actividad | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>(() =>
    normalizarActividades(actividadesProp)
  );
  const [actividadAEliminar, setActividadAEliminar] = useState<Actividad | null>(null);
  const [modoPanel, setModoPanel] = useState<"detalle" | "edicion">("detalle");
  const [fechaEdicion, setFechaEdicion] = useState("");
  const [descripcionEdicion, setDescripcionEdicion] = useState("");
  const [nuevasEvidencias, setNuevasEvidencias] = useState<File[]>([]);
  const [evidenciasCountEdicion, setEvidenciasCountEdicion] = useState(0);
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    setActividades(normalizarActividades(actividadesProp));
  }, [actividadesProp]);

  useEffect(() => {
    if (!seleccionada) {
      setModoPanel("detalle");
      return;
    }

    const existe = actividades.some((actividad) => actividad.id === seleccionada.id);

    if (!existe) {
      setSeleccionada(null);
      setModoPanel("detalle");
    }
  }, [actividades, seleccionada]);

  useEffect(() => {
    if (!seleccionada || modoPanel !== "edicion") {
      return;
    }

    setFechaEdicion(seleccionada.fecha);
    setDescripcionEdicion(seleccionada.actividad_original);
    setEvidenciasCountEdicion(seleccionada.evidencias_count ?? 0);
    setNuevasEvidencias([]);
  }, [modoPanel, seleccionada]);

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

  function abrirDetalle(actividad: Actividad) {
    setSeleccionada(actividad);
    setModoPanel("detalle");
    setMensaje(null);
  }

  function cerrarPanel() {
    setSeleccionada(null);
    setModoPanel("detalle");
    setNuevasEvidencias([]);
  }

  function iniciarEdicion() {
    if (!seleccionada) {
      return;
    }

    setFechaEdicion(seleccionada.fecha);
    setDescripcionEdicion(seleccionada.actividad_original);
    setEvidenciasCountEdicion(seleccionada.evidencias_count ?? 0);
    setNuevasEvidencias([]);
    setModoPanel("edicion");
    setMensaje(null);
  }

  function cancelarEdicion() {
    setModoPanel("detalle");
    setNuevasEvidencias([]);
    setMensaje(null);
  }

  function actualizarActividadEnEstado(actividadActualizada: Actividad) {
    setActividades((prev) =>
      prev.map((actividad) =>
        actividad.id === actividadActualizada.id ? actividadActualizada : actividad
      )
    );
    setSeleccionada(actividadActualizada);
  }

  function guardarEdicion() {
    if (!seleccionada) {
      return;
    }

    const actividadId = seleccionada.id;
    const fecha = fechaEdicion.trim();
    const descripcion = descripcionEdicion.trim();

    if (!fecha) {
      setMensaje({ type: "error", text: "La fecha es obligatoria." });
      return;
    }

    if (!descripcion) {
      setMensaje({ type: "error", text: "La descripción es obligatoria." });
      return;
    }

    startTransition(async () => {
      const resultado = await actualizarActividad({
        actividadId,
        fecha,
        actividad: descripcion,
      });

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      let evidenciasAgregadas = 0;
      let actividadActualizada: Actividad = {
        ...seleccionada,
        ...resultado.actividad,
        palabras_clave: normalizePalabrasClave(resultado.actividad.palabras_clave),
        clasificacion_manual: resultado.actividad.clasificacion_manual ?? false,
        puntaje_clasificacion: resultado.actividad.puntaje_clasificacion ?? 0,
        evidencias_count: evidenciasCountEdicion,
      };

      if (nuevasEvidencias.length > 0) {
        let referenciasSubidas: { url: string; nombre_archivo: string }[] = [];

        try {
          referenciasSubidas = await subirEvidenciasAlStorage(actividadId, nuevasEvidencias);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "No se pudieron subir las evidencias.";

          setMensaje({ type: "error", text: message });
          return;
        }

        const refResult = await guardarEvidenciasActividad({
          actividadId,
          evidencias: referenciasSubidas,
        });

        if (!refResult.success) {
          await eliminarEvidenciasStorage(referenciasSubidas.map((referencia) => referencia.url));
          setMensaje({ type: "error", text: refResult.error });
          return;
        }

        evidenciasAgregadas = refResult.evidencias_agregadas;
        actividadActualizada = {
          ...actividadActualizada,
          evidencias_count: evidenciasCountEdicion + evidenciasAgregadas,
        };
      }

      actualizarActividadEnEstado(actividadActualizada);
      setNuevasEvidencias([]);
      setModoPanel("detalle");

      const detalleEvidencias =
        evidenciasAgregadas > 0
          ? ` Se agregaron ${evidenciasAgregadas} evidencia(s).`
          : "";

      setMensaje({
        type: "success",
        text: `Actividad actualizada y reanalizada con IA correctamente.${detalleEvidencias}`,
      });
    });
  }

  function solicitarEliminacion(event: React.MouseEvent, actividad: Actividad) {
    event.stopPropagation();
    setActividadAEliminar(actividad);
  }

  function cancelarEliminacion() {
    if (isPending) {
      return;
    }

    setActividadAEliminar(null);
  }

  function confirmarEliminacion() {
    if (!actividadAEliminar) {
      return;
    }

    const actividadId = actividadAEliminar.id;
    const evidenciasCount = actividadAEliminar.evidencias_count ?? 0;

    startTransition(async () => {
      const resultado = await eliminarActividad(actividadId);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setActividades((prev) => prev.filter((actividad) => actividad.id !== actividadId));
      setSeleccionada(null);
      setModoPanel("detalle");
      setActividadAEliminar(null);

      const detalleEvidencias =
        evidenciasCount > 0
          ? ` Se eliminaron ${resultado.archivos_eliminados} archivo(s) en Storage.`
          : "";

      setMensaje({
        type: "success",
        text: `Actividad eliminada correctamente.${detalleEvidencias}`,
      });
    });
  }

  if (actividades.length === 0) {
    return (
      <p className="text-sm text-zinc-600">Aún no hay actividades registradas.</p>
    );
  }

  return (
    <>
      {mensaje ? (
        <p
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            mensaje.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensaje.text}
        </p>
      ) : null}

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
                <th className="px-4 py-3">Evidencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {actividadesFiltradas.map((actividad) => {
                const isSelected = seleccionada?.id === actividad.id;

                return (
                  <tr
                    key={actividad.id}
                    onClick={() => abrirDetalle(actividad)}
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
                    <td className="whitespace-nowrap px-4 py-4 text-zinc-700">
                      {formatearIndicadorEvidencias(actividad.evidencias_count ?? 0)}
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
            onClick={cerrarPanel}
            className="absolute inset-0 bg-zinc-900/30"
          />

          <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                {modoPanel === "edicion" ? "Editar actividad" : "Detalle de actividad"}
              </h2>
              <button
                type="button"
                onClick={cerrarPanel}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Cerrar
              </button>
            </div>

            {modoPanel === "detalle" ? (
              <>
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

                  <DetalleSeccion
                    titulo="Resumen IA"
                    contenido={seleccionada.resumen_ia}
                    multiline
                  />

                  <DetalleSeccion
                    titulo="Redacción IA"
                    contenido={seleccionada.redaccion_ia}
                    multiline
                  />

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-700">Evidencias fotográficas</h3>
                    <EvidenciasActividadGaleria
                      actividadId={seleccionada.id}
                      cantidad={seleccionada.evidencias_count ?? 0}
                    />
                  </div>

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

                <div className="space-y-3 border-t border-zinc-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={iniciarEdicion}
                    disabled={isPending}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Editar actividad
                  </button>
                  <button
                    type="button"
                    onClick={(event) => solicitarEliminacion(event, seleccionada)}
                    disabled={isPending}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
                  >
                    Eliminar actividad
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                  {isPending ? (
                    <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                      Analizando la actividad con IA y guardando cambios. Esto puede tardar unos
                      segundos.
                    </p>
                  ) : null}

                  <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                    Al guardar, la actividad se reanalizará con IA usando el mismo proceso del
                    registro. Se actualizarán proyecto, obligación, resumen, redacción y palabras
                    clave. Las evidencias existentes se conservan.
                  </p>

                  <div className="space-y-2">
                    <label htmlFor="editar-fecha" className="block text-sm font-medium text-zinc-700">
                      Fecha
                    </label>
                    <input
                      id="editar-fecha"
                      type="date"
                      value={fechaEdicion}
                      onChange={(event) => setFechaEdicion(event.target.value)}
                      disabled={isPending}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="editar-descripcion"
                      className="block text-sm font-medium text-zinc-700"
                    >
                      Descripción de la actividad
                    </label>
                    <textarea
                      id="editar-descripcion"
                      value={descripcionEdicion}
                      onChange={(event) => setDescripcionEdicion(event.target.value)}
                      disabled={isPending}
                      rows={6}
                      className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                    />
                  </div>

                  <EvidenciasActividadEditor
                    actividadId={seleccionada.id}
                    evidenciasCount={evidenciasCountEdicion}
                    nuevasEvidencias={nuevasEvidencias}
                    onNuevasEvidenciasChange={setNuevasEvidencias}
                    onEvidenciasCountChange={(count) => {
                      setEvidenciasCountEdicion(count);
                      actualizarActividadEnEstado({
                        ...seleccionada,
                        evidencias_count: count,
                      });
                    }}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-3 border-t border-zinc-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={guardarEdicion}
                    disabled={isPending}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isPending ? "Guardando y analizando con IA..." : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    disabled={isPending}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <ConfirmarAccionModal
        abierto={Boolean(actividadAEliminar)}
        titulo="Eliminar actividad"
        descripcion={
          actividadAEliminar
            ? `¿Eliminar la actividad del ${formatFecha(actividadAEliminar.fecha)}? Se borrarán también ${formatearIndicadorEvidencias(actividadAEliminar.evidencias_count ?? 0).toLowerCase()} y los archivos asociados en Storage. Esta acción no se puede deshacer.`
            : ""
        }
        confirmarEtiqueta="Eliminar"
        confirmando={isPending}
        onConfirmar={confirmarEliminacion}
        onCancelar={cancelarEliminacion}
      />
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
