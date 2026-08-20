"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  obtenerDatosRespaldoAiac,
  restaurarRespaldoAiac,
} from "@/app/(dashboard)/configuracion-ia/actions";
import {
  construirNombreArchivoExportConfiguracion,
  construirNombreArchivoExportContrato,
  construirNombreArchivoRespaldoCompleto,
  descargarJsonEnNavegador,
  parsearRespaldoImportable,
} from "@/lib/respaldo-aiac";

export default function RespaldoAiacPanel() {
  const router = useRouter();
  const inputRespaldoRef = useRef<HTMLInputElement>(null);
  const inputConfiguracionRef = useRef<HTMLInputElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function cargarDatosRespaldo() {
    const resultado = await obtenerDatosRespaldoAiac();

    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    return resultado.datos;
  }

  async function handleDescargarRespaldoCompleto() {
    setDescargando(true);
    setMensaje(null);

    try {
      const datos = await cargarDatosRespaldo();
      descargarJsonEnNavegador(
        datos.respaldo,
        construirNombreArchivoRespaldoCompleto(datos.respaldo.contrato.nombre)
      );
      setMensaje({ type: "success", text: "Respaldo AIAC descargado correctamente." });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo descargar el respaldo AIAC.";
      setMensaje({ type: "error", text });
    } finally {
      setDescargando(false);
    }
  }

  async function handleExportarConfiguracionIA() {
    setDescargando(true);
    setMensaje(null);

    try {
      const datos = await cargarDatosRespaldo();
      descargarJsonEnNavegador(
        datos.exportConfiguracion,
        construirNombreArchivoExportConfiguracion(datos.exportConfiguracion.contrato)
      );
      setMensaje({ type: "success", text: "Configuración IA exportada correctamente." });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo exportar la configuración IA.";
      setMensaje({ type: "error", text });
    } finally {
      setDescargando(false);
    }
  }

  async function handleExportarContrato() {
    setDescargando(true);
    setMensaje(null);

    try {
      const datos = await cargarDatosRespaldo();
      descargarJsonEnNavegador(
        datos.exportContrato,
        construirNombreArchivoExportContrato(datos.exportContrato.contrato)
      );
      setMensaje({ type: "success", text: "Contrato exportado correctamente." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo exportar el contrato.";
      setMensaje({ type: "error", text });
    } finally {
      setDescargando(false);
    }
  }

  async function restaurarDesdeArchivo(file: File, origen: "respaldo" | "configuracion") {
    setRestaurando(true);
    setMensaje(null);

    try {
      const contenido = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(contenido);
      } catch {
        setMensaje({ type: "error", text: "El archivo no contiene JSON válido." });
        return;
      }

      if (origen === "configuracion") {
        const validado = parsearRespaldoImportable(parsed);

        if (!validado) {
          setMensaje({
            type: "error",
            text: "Selecciona un JSON exportado de configuración IA o un respaldo completo.",
          });
          return;
        }
      }

      const resultado = await restaurarRespaldoAiac(parsed);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({
        type: "success",
        text:
          origen === "respaldo"
            ? "Respaldo AIAC restaurado correctamente."
            : "Configuración IA importada correctamente.",
      });
      router.refresh();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo restaurar desde el archivo.";
      setMensaje({ type: "error", text });
    } finally {
      setRestaurando(false);
    }
  }

  function handleSeleccionRespaldoCompleto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    void restaurarDesdeArchivo(file, "respaldo");
  }

  function handleSeleccionConfiguracion(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    void restaurarDesdeArchivo(file, "configuracion");
  }

  const ocupado = descargando || restaurando;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">Respaldo y recuperación</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Exporta o restaura tu contrato y configuración IA. No incluye actividades ni auditoría.
        </p>
      </header>

      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">Respaldo completo</p>
          <p className="mt-1 text-sm text-zinc-600">
            Contrato, objeto, obligaciones, instrucciones IA, estilo, ejemplos y contexto técnico.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleDescargarRespaldoCompleto()}
              disabled={ocupado}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {descargando ? "Preparando..." : "Descargar respaldo AIAC"}
            </button>
            <button
              type="button"
              onClick={() => inputRespaldoRef.current?.click()}
              disabled={ocupado}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60"
            >
              {restaurando ? "Restaurando..." : "Restaurar respaldo AIAC"}
            </button>
            <input
              ref={inputRespaldoRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleSeleccionRespaldoCompleto}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-900">Configuración IA</p>
            <p className="mt-1 text-sm text-zinc-600">
              Contrato, objeto, obligaciones, instrucciones, ejemplos y contexto técnico.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleExportarConfiguracionIA()}
                disabled={ocupado}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Exportar configuración IA
              </button>
              <button
                type="button"
                onClick={() => inputConfiguracionRef.current?.click()}
                disabled={ocupado}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Importar configuración IA
              </button>
              <input
                ref={inputConfiguracionRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleSeleccionConfiguracion}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-900">Contrato</p>
            <p className="mt-1 text-sm text-zinc-600">
              Descarga contrato, objeto contractual y obligaciones en JSON.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleExportarContrato()}
                disabled={ocupado}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Exportar contrato
              </button>
            </div>
          </div>
        </div>

        {mensaje ? (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              mensaje.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {mensaje.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
