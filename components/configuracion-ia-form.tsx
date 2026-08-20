"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ConfiguracionIA, ConfiguracionIAFormData } from "@/types/configuracion-ia";

type ConfiguracionIAFormProps = {
  configuracion: ConfiguracionIA | null;
};

const emptyForm: ConfiguracionIAFormData = {
  estilo_redaccion: "",
  ejemplos_redaccion: "",
  instrucciones_informe: "",
  contexto_tecnico: "",
};

export default function ConfiguracionIAForm({ configuracion }: ConfiguracionIAFormProps) {
  const [form, setForm] = useState<ConfiguracionIAFormData>(
    configuracion
      ? {
          estilo_redaccion: configuracion.estilo_redaccion,
          ejemplos_redaccion: configuracion.ejemplos_redaccion,
          instrucciones_informe: configuracion.instrucciones_informe,
          contexto_tecnico: configuracion.contexto_tecnico,
        }
      : emptyForm
  );
  const [configuracionId, setConfiguracionId] = useState<string | null>(
    configuracion?.id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function handleChange(field: keyof ConfiguracionIAFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (configuracionId) {
        const { error } = await supabase
          .from("configuracion_ia")
          .update(form)
          .eq("id", configuracionId);

        if (error) throw error;

        setMessage({ type: "success", text: "Configuración IA actualizada correctamente." });
      } else {
        const { data, error } = await supabase
          .from("configuracion_ia")
          .insert(form)
          .select("id")
          .single();

        if (error) throw error;

        setConfiguracionId(data.id);
        setMessage({ type: "success", text: "Configuración IA guardada correctamente." });
      }
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo guardar la configuración IA.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="instrucciones_informe"
          className="block text-sm font-medium text-zinc-700"
        >
          Instrucciones de informe
        </label>
        <textarea
          id="instrucciones_informe"
          name="instrucciones_informe"
          rows={8}
          value={form.instrucciones_informe}
          onChange={(event) => handleChange("instrucciones_informe", event.target.value)}
          placeholder="Indica lineamientos generales para la redacción de informes mensuales..."
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Define criterios generales que la IA debe respetar al redactar actividades e informes.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="estilo_redaccion" className="block text-sm font-medium text-zinc-700">
          Estilo de redacción
        </label>
        <textarea
          id="estilo_redaccion"
          name="estilo_redaccion"
          rows={10}
          value={form.estilo_redaccion}
          onChange={(event) => handleChange("estilo_redaccion", event.target.value)}
          placeholder={`Las actividades deben redactarse en primera persona.

Mantener lenguaje institucional.

Utilizar expresiones como:
Apoyé la Dirección de TIC, con...

Evitar lenguaje informal.

No inventar resultados ni entregables.`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Describe cómo prefieres que se redacten tus actividades contractuales.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="ejemplos_redaccion" className="block text-sm font-medium text-zinc-700">
          Ejemplos de redacción
        </label>
        <textarea
          id="ejemplos_redaccion"
          name="ejemplos_redaccion"
          rows={10}
          value={form.ejemplos_redaccion}
          onChange={(event) => handleChange("ejemplos_redaccion", event.target.value)}
          placeholder={`Apoyé la Dirección de TIC, con la revisión técnica de los informes de interventoría...

Apoyé la Dirección de TIC, con la gestión y articulación técnica para...`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Pega ejemplos reales que representen tu estilo de redacción.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="contexto_tecnico" className="block text-sm font-medium text-zinc-700">
          Contexto técnico
        </label>
        <textarea
          id="contexto_tecnico"
          name="contexto_tecnico"
          rows={12}
          value={form.contexto_tecnico}
          onChange={(event) => handleChange("contexto_tecnico", event.target.value)}
          placeholder={`Audio Zonal pertenece al ecosistema SIRCI.
RFID pertenece a Bus-Estación.
BCA-PAT pertenece al ecosistema SIRCI.
Compartir SIRCI no implica que dos actividades deban consolidarse.
FET y Audio Zonal son frentes distintos.`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Define reglas de negocio de tu contrato para clasificación, identificación de frentes y
          consolidación. No afecta la redacción de actividades.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar configuración IA"}
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
