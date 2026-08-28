"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConfiguracionIA, ConfiguracionIAFormData } from "@/types/configuracion-ia";

type ConfiguracionIAFormProps = {
  configuracion: ConfiguracionIA | null;
};

const emptyForm: ConfiguracionIAFormData = {
  instrucciones_informe: "",
  contexto_tecnico: "",
  estilo_redaccion: "",
  ejemplos_redaccion: "",
};

export default function ConfiguracionIAForm({ configuracion }: ConfiguracionIAFormProps) {
  const [form, setForm] = useState<ConfiguracionIAFormData>(
    configuracion
      ? {
          instrucciones_informe: configuracion.instrucciones_informe,
          contexto_tecnico: configuracion.contexto_tecnico,
          estilo_redaccion: configuracion.estilo_redaccion,
          ejemplos_redaccion: configuracion.ejemplos_redaccion,
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
      const supabase = createClient();

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
          Reglas del contrato
        </label>
        <textarea
          id="instrucciones_informe"
          name="instrucciones_informe"
          rows={8}
          value={form.instrucciones_informe}
          onChange={(event) => handleChange("instrucciones_informe", event.target.value)}
          placeholder={`No asociar actividades del ecosistema SIRCI a la obligación 1.
No expandir siglas en redacción salvo que aparezcan desarrolladas en la actividad original.
Agrupar en informe por frente de trabajo y tipo de actividad.
No inventar resultados, beneficios ni impactos.`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Reglas de clasificación, redacción y consolidación. Tienen prioridad sobre el
          comportamiento base del sistema.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="contexto_tecnico" className="block text-sm font-medium text-zinc-700">
          Contexto técnico y frentes
        </label>
        <textarea
          id="contexto_tecnico"
          name="contexto_tecnico"
          rows={12}
          value={form.contexto_tecnico}
          onChange={(event) => handleChange("contexto_tecnico", event.target.value)}
          placeholder={`Ecosistema: SIRCI
Frentes: Masivo Capital (alias: MarcoPolo), ZMO, ETIB, FET, BCA-PAT

Ecosistema: SIGMP
Frentes: Puertas automáticas, ITS de puertas

Agrupación:
- Mismo proyecto no implica consolidar en una sola fila
- Masivo Capital y ZMO son frentes distintos`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Ecosistemas, frentes de trabajo, siglas y criterios de agrupación. No define el estilo
          de redacción.
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
          placeholder={`Redactar en primera persona del singular, tiempo pasado.
Prefijo contractual: Apoyé a la Dirección de TIC, mediante...
Conectores preferidos: mediante, con la, para la
Lenguaje institucional y técnico.`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Define persona, tiempo verbal, prefijos y conectores contractuales.
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
          placeholder={`Entrada: validación equipamiento sirci zmo
Salida: Apoyé a la Dirección de TIC, mediante la validación de la instalación de equipamiento SIRCI en ZMO.

Entrada: visita ETIB revisión BCA-PAT
Salida: Apoyé a la Dirección de TIC, mediante la realización de visita técnica al concesionario ETIB para la revisión de BCA-PAT.`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Ejemplos reales de entrada y salida que sirven como referencia para la redacción.
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
