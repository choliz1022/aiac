"use client";

import { useState } from "react";
import { analizarYGuardarActividad } from "@/app/(dashboard)/registrar-actividad/actions";

type RegistrarActividadFormProps = {
  contratoId: string;
};

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function RegistrarActividadForm({
  contratoId,
}: RegistrarActividadFormProps) {
  const [fecha, setFecha] = useState(getTodayDate);
  const [actividad, setActividad] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const result = await analizarYGuardarActividad({
        fecha,
        actividad,
      });

      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setActividad("");
      setMessage({ type: "success", text: "Actividad guardada correctamente." });
    } catch (error) {
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

      <div className="space-y-2">
        <label htmlFor="actividad" className="block text-sm font-medium text-zinc-700">
          Actividad
        </label>
        <textarea
          id="actividad"
          name="actividad"
          required
          rows={12}
          value={actividad}
          onChange={(event) => {
            setActividad(event.target.value);
            setMessage(null);
          }}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Describe la actividad tal como la recuerdas. La IA se encargará
          posteriormente de clasificarla y redactarla para el informe.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Analizando y guardando..." : "Analizar y guardar"}
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
