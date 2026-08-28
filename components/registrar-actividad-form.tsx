"use client";

import { useState } from "react";
import {
  analizarActividadPreview,
  guardarActividadConfirmada,
  guardarReferenciasEvidencias,
  reanalizarRedaccionActividad,
  revertirActividadRegistrada,
} from "@/app/(dashboard)/registrar-actividad/actions";
import EvidenciasActividadInput from "@/components/evidencias-actividad-input";
import VistaPreviaAnalisisActividad from "@/components/vista-previa-analisis-actividad";
import {
  eliminarEvidenciasStorage,
  subirEvidenciasAlStorage,
} from "@/lib/evidencias-client";
import { formatearIndicadorEvidencias } from "@/lib/evidencias";
import type { AnalisisActividadResult } from "@/types/analisis-actividad";

type RegistrarActividadFormProps = {
  contratoId: string;
};

type PasoRegistro = "formulario" | "vista-previa";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function RegistrarActividadForm({
  contratoId: _contratoId,
}: RegistrarActividadFormProps) {
  const [fecha, setFecha] = useState(getTodayDate);
  const [actividad, setActividad] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [paso, setPaso] = useState<PasoRegistro>("formulario");
  const [analisisPreview, setAnalisisPreview] = useState<AnalisisActividadResult | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function ejecutarAnalisis(): Promise<boolean> {
    if (!fecha.trim()) {
      setMessage({ type: "error", text: "La fecha es obligatoria." });
      return false;
    }

    if (!actividad.trim()) {
      setMessage({ type: "error", text: "La actividad es obligatoria." });
      return false;
    }

    setAnalizando(true);
    setMessage(null);

    try {
      const result = await analizarActividadPreview({ actividad });

      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return false;
      }

      setAnalisisPreview(result.analisis);
      setPaso("vista-previa");
      return true;
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo analizar la actividad.";
      setMessage({ type: "error", text });
      return false;
    } finally {
      setAnalizando(false);
    }
  }

  async function handleAnalizar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ejecutarAnalisis();
  }

  async function handleReanalizar() {
    if (!analisisPreview) {
      return;
    }

    if (!actividad.trim()) {
      setMessage({ type: "error", text: "La actividad es obligatoria." });
      return;
    }

    setAnalizando(true);
    setMessage(null);

    try {
      const result = await reanalizarRedaccionActividad({
        actividad,
        analisis: analisisPreview,
      });

      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setAnalisisPreview(result.analisis);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo regenerar la redacción.";
      setMessage({ type: "error", text });
    } finally {
      setAnalizando(false);
    }
  }

  function handleVolverAEditar() {
    setPaso("formulario");
    setAnalisisPreview(null);
    setMessage(null);
  }

  async function handleGuardarActividad() {
    if (!analisisPreview) {
      return;
    }

    setGuardando(true);
    setMessage(null);

    let actividadId: string | null = null;
    let rutasSubidas: string[] = [];

    try {
      const result = await guardarActividadConfirmada({
        fecha,
        actividad,
        analisis: analisisPreview,
      });

      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      actividadId = result.actividad_id;

      if (evidencias.length > 0) {
        const referencias = await subirEvidenciasAlStorage(result.actividad_id, evidencias);
        rutasSubidas = referencias.map((referencia) => referencia.url);

        const referenciasResult = await guardarReferenciasEvidencias({
          actividadId: result.actividad_id,
          evidencias: referencias,
        });

        if (!referenciasResult.success) {
          await eliminarEvidenciasStorage(rutasSubidas);
          await revertirActividadRegistrada(result.actividad_id);
          setMessage({ type: "error", text: referenciasResult.error });
          return;
        }

        setActividad("");
        setEvidencias([]);
        setAnalisisPreview(null);
        setPaso("formulario");
        setMessage({
          type: "success",
          text: `Actividad guardada correctamente. ${formatearIndicadorEvidencias(referenciasResult.evidencias_count)}.`,
        });
        return;
      }

      setActividad("");
      setEvidencias([]);
      setAnalisisPreview(null);
      setPaso("formulario");
      setMessage({
        type: "success",
        text: `Actividad guardada correctamente. ${formatearIndicadorEvidencias(0)}.`,
      });
    } catch (error) {
      if (actividadId) {
        if (rutasSubidas.length > 0) {
          await eliminarEvidenciasStorage(rutasSubidas);
        }

        await revertirActividadRegistrada(actividadId);
      }

      const text =
        error instanceof Error ? error.message : "No se pudo guardar la actividad.";
      setMessage({ type: "error", text });
    } finally {
      setGuardando(false);
    }
  }

  const procesando = analizando || guardando;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAnalizar} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="fecha" className="block text-sm font-medium text-zinc-700">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            required
            value={fecha}
            disabled={procesando}
            onChange={(event) => {
              setFecha(event.target.value);
              setMessage(null);
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 sm:max-w-xs"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-stretch">
          <div className="flex min-h-[420px] flex-col space-y-2">
            <label htmlFor="actividad" className="block text-sm font-medium text-zinc-700">
              Actividad
            </label>
            <textarea
              id="actividad"
              name="actividad"
              required
              value={actividad}
              disabled={procesando}
              onChange={(event) => {
                setActividad(event.target.value);
                setMessage(null);
                if (paso === "vista-previa") {
                  setPaso("formulario");
                  setAnalisisPreview(null);
                }
              }}
              placeholder="Describe la actividad tal como la recuerdas..."
              className="min-h-[360px] flex-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 lg:min-h-[380px]"
            />
            <p className="text-sm leading-6 text-zinc-500">
              La IA clasificará y redactará esta actividad para el informe.
            </p>
          </div>

          <div className="min-h-[420px]">
            <EvidenciasActividadInput
              archivos={evidencias}
              onChange={setEvidencias}
              disabled={procesando}
              variant="sidebar"
            />
          </div>
        </div>

        {paso === "formulario" ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={procesando}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analizando ? "Analizando con IA..." : "Analizar"}
            </button>

            {message && (
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        ) : null}
      </form>

      {paso === "vista-previa" && analisisPreview ? (
        <VistaPreviaAnalisisActividad
          analisis={analisisPreview}
          analizando={analizando}
          guardando={guardando}
          onReanalizar={handleReanalizar}
          onGuardar={handleGuardarActividad}
          onEditar={handleVolverAEditar}
        />
      ) : null}

      {paso === "vista-previa" && message ? (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
