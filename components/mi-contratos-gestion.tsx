"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  actualizarContratoAction,
  archivarContratoAction,
  cambiarContratoActivoAction,
  crearContratoAction,
} from "@/app/(dashboard)/mi-contrato/actions";
import ContratoForm from "@/components/contrato-form";
import type { Contrato } from "@/types/contrato";
import type { ContratoListado, EstadoLimiteContratos } from "@/types/contrato-activo";

type MiContratosGestionProps = {
  contratos: ContratoListado[];
  contratoActivoId: string | null;
  contratoActivo: Contrato | null;
  limiteContratos: EstadoLimiteContratos;
  puedeMultiContrato: boolean;
  esVistaSimple?: boolean;
  tieneArchivados?: boolean;
};

type Vista = "lista" | "crear" | "editar";

function etiquetaLista(contrato: ContratoListado): string {
  if (contrato.alias.trim()) {
    return `${contrato.nombre} (${contrato.alias.trim()})`;
  }

  return contrato.nombre;
}

export default function MiContratosGestion({
  contratos,
  contratoActivoId,
  contratoActivo,
  limiteContratos,
  puedeMultiContrato,
  esVistaSimple = false,
  tieneArchivados = false,
}: MiContratosGestionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [vista, setVista] = useState<Vista>(
    contratoActivo ? "editar" : esVistaSimple ? "crear" : "lista"
  );
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    setVista((actual) => {
      if (actual === "crear") {
        return actual;
      }

      if (contratoActivo) {
        return "editar";
      }

      return esVistaSimple ? "crear" : "lista";
    });
  }, [contratoActivoId, contratoActivo, esVistaSimple]);

  const contratosVisibles = mostrarArchivados
    ? contratos
    : contratos.filter((contrato) => contrato.estado === "activo");

  function refrescar() {
    router.refresh();
  }

  function iniciarEdicion(contrato: ContratoListado) {
    if (contrato.estado === "archivado") {
      setMensaje({ type: "error", text: "Los contratos archivados son solo de consulta." });
      return;
    }

    setMensaje(null);

    if (contrato.id !== contratoActivoId) {
      startTransition(async () => {
        const resultado = await cambiarContratoActivoAction(contrato.id);

        if (!resultado.success) {
          setMensaje({ type: "error", text: resultado.error });
          return;
        }

        setMensaje({ type: "success", text: "Contrato activo actualizado." });
        setVista("editar");
        refrescar();
      });
      return;
    }

    setVista("editar");
  }

  function handleUsarComoActivo(contratoId: string) {
    if (contratoId === contratoActivoId) {
      setVista("editar");
      return;
    }

    startTransition(async () => {
      const resultado = await cambiarContratoActivoAction(contratoId);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({ type: "success", text: "Contrato activo actualizado." });
      setVista("editar");
      refrescar();
    });
  }

  function handleArchivar(contratoId: string) {
    if (
      !window.confirm(
        "¿Archivar este contrato? Dejará de estar disponible como activo y no aparecerá en el listado principal."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const resultado = await archivarContratoAction(contratoId);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({ type: "success", text: "Contrato archivado correctamente." });
      setVista(contratoActivo ? "editar" : esVistaSimple ? "crear" : "lista");
      refrescar();
    });
  }

  const puedeCrearContrato = !limiteContratos.enLimite;

  function intentarCrearContrato() {
    if (!puedeCrearContrato) {
      setMensaje({
        type: "error",
        text:
          limiteContratos.mensajeAdvertencia ??
          "Has alcanzado el límite de contratos activos de tu plan.",
      });
      return;
    }

    setVista("crear");
    setMensaje(null);
  }

  return (
    <div className="space-y-6">
      {limiteContratos.enLimite && limiteContratos.mensajeAdvertencia ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {limiteContratos.mensajeAdvertencia}
        </div>
      ) : null}

      {mensaje ? (
        <p
          className={`text-sm ${mensaje.type === "success" ? "text-emerald-700" : "text-red-600"}`}
        >
          {mensaje.text}
        </p>
      ) : null}

      {!esVistaSimple || tieneArchivados ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {tieneArchivados ? (
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={mostrarArchivados}
                onChange={(event) => setMostrarArchivados(event.target.checked)}
                className="rounded border-zinc-300"
              />
              Mostrar archivados
            </label>
          ) : (
            <span />
          )}

          {!esVistaSimple ? (
            <button
              type="button"
              onClick={intentarCrearContrato}
              disabled={isPending || !puedeCrearContrato}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Nuevo contrato
            </button>
          ) : null}
        </div>
      ) : null}

      {!esVistaSimple ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Tus contratos</h2>
          {contratosVisibles.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">No hay contratos para mostrar.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {contratosVisibles.map((contrato) => {
                const esActivo = contrato.id === contratoActivoId && contrato.estado === "activo";
                const esArchivado = contrato.estado === "archivado";

                return (
                  <li
                    key={contrato.id}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {etiquetaLista(contrato)}
                        {esActivo ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            Activo
                          </span>
                        ) : null}
                        {esArchivado ? (
                          <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                            Archivado
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-zinc-600">{contrato.entidad}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!esArchivado ? (
                        <>
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(contrato)}
                            disabled={isPending}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Editar
                          </button>
                          {!esActivo ? (
                            <button
                              type="button"
                              onClick={() => handleUsarComoActivo(contrato.id)}
                              disabled={isPending}
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              Usar como activo
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleArchivar(contrato.id)}
                            disabled={isPending}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Archivar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {vista === "crear" ? (
        <section className={esVistaSimple ? undefined : "rounded-xl border border-zinc-200 bg-white p-6"}>
          {!esVistaSimple ? (
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Crear contrato</h2>
          ) : null}
          <ContratoForm
            key="crear-contrato"
            modo="crear"
            contrato={null}
            disabled={isPending}
            onSubmitAction={crearContratoAction}
            onSuccess={() => {
              setVista("editar");
              refrescar();
            }}
            onCancel={
              esVistaSimple && contratoActivo
                ? () => setVista("editar")
                : esVistaSimple
                  ? undefined
                  : () => setVista("lista")
            }
          />
        </section>
      ) : null}

      {vista === "editar" && isPending && !contratoActivo ? (
        <p className="text-sm text-zinc-600">Cargando contrato activo...</p>
      ) : null}

      {vista === "editar" && contratoActivo ? (
        esVistaSimple ? (
          <ContratoForm
            key={contratoActivo.id}
            modo="editar"
            contrato={contratoActivo}
            disabled={isPending}
            onSubmitAction={(form) => actualizarContratoAction(contratoActivo.id, form)}
            onSuccess={refrescar}
          />
        ) : (
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Editar contrato activo</h2>
            <ContratoForm
              key={contratoActivo.id}
              modo="editar"
              contrato={contratoActivo}
              disabled={isPending}
              onSubmitAction={(form) => actualizarContratoAction(contratoActivo.id, form)}
              onSuccess={refrescar}
              onArchivar={() => handleArchivar(contratoActivo.id)}
              onCancel={() => setVista("lista")}
            />
          </section>
        )
      ) : null}

      {esVistaSimple && contratoActivo && vista !== "crear" ? (
        <div className="mt-6 border-t border-zinc-200 pt-4">
          {puedeMultiContrato ? (
            <button
              type="button"
              onClick={intentarCrearContrato}
              disabled={isPending || !puedeCrearContrato}
              className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar otro contrato
            </button>
          ) : (
            <p className="text-sm text-zinc-500">
              La gestión de varios contratos activos está disponible en el plan Profesional. Puedes
              archivar el contrato actual para crear uno nuevo con tu plan actual.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
