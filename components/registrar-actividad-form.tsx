"use client";

import { useState } from "react";
import {
  analizarYGuardarActividad,
  guardarReferenciasEvidencias,
  revertirActividadRegistrada,
} from "@/app/(dashboard)/registrar-actividad/actions";
import EvidenciasActividadInput from "@/components/evidencias-actividad-input";
import {
  eliminarEvidenciasStorage,
  subirEvidenciasAlStorage,
} from "@/lib/evidencias-client";
import { formatearIndicadorEvidencias } from "@/lib/evidencias";

type RegistrarActividadFormProps = {
  contratoId: string;
};

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function RegistrarActividadForm({
  contratoId: _contratoId,
}: RegistrarActividadFormProps) {
  const [fecha, setFecha] = useState(getTodayDate);
  const [actividad, setActividad] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    let actividadId: string | null = null;
    let rutasSubidas: string[] = [];

    try {
      const result = await analizarYGuardarActividad({ fecha, actividad });

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
        setMessage({
          type: "success",
          text: `Actividad guardada correctamente. ${formatearIndicadorEvidencias(referenciasResult.evidencias_count)}.`,
        });
        return;
      }

      setActividad("");
      setEvidencias([]);
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
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          onChange={(event) => {
            setFecha(event.target.value);
            setMessage(null);
          }}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 sm:max-w-xs"
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
            onChange={(event) => {
              setActividad(event.target.value);
              setMessage(null);
            }}
            placeholder="Describe la actividad tal como la recuerdas..."
            className="min-h-[360px] flex-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 lg:min-h-[380px]"
          />
          <p className="text-sm leading-6 text-zinc-500">
            La IA clasificará y redactará esta actividad para el informe.
          </p>
        </div>

        <div className="min-h-[420px]">
          <EvidenciasActividadInput
            archivos={evidencias}
            onChange={setEvidencias}
            disabled={saving}
            variant="sidebar"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? evidencias.length > 0
              ? "Analizando, guardando y subiendo..."
              : "Analizando y guardando..."
            : "Analizar y guardar"}
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
    </form>
  );
}
