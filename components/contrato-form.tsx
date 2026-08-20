"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contrato, ContratoFormData } from "@/types/contrato";

type ContratoFormProps = {
  contrato: Contrato | null;
};

const emptyForm: ContratoFormData = {
  nombre: "",
  entidad: "",
  objeto_contractual: "",
  obligaciones: "",
};

function logSupabaseError(error: unknown) {
  console.error("Error completo de Supabase:", error);

  if (error && typeof error === "object") {
    const supabaseError = error as {
      message?: string;
      details?: string | null;
      hint?: string | null;
      code?: string | null;
    };

    console.error("error.message:", supabaseError.message);
    console.error("error.details:", supabaseError.details);
    console.error("error.hint:", supabaseError.hint);
    console.error("error.code:", supabaseError.code);
  }
}

export default function ContratoForm({ contrato }: ContratoFormProps) {
  const [form, setForm] = useState<ContratoFormData>(
    contrato
      ? {
          nombre: contrato.nombre,
          entidad: contrato.entidad,
          objeto_contractual: contrato.objeto_contractual,
          obligaciones: contrato.obligaciones,
        }
      : emptyForm
  );
  const [contratoId, setContratoId] = useState<string | null>(contrato?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function handleChange(
    field: keyof ContratoFormData,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (contratoId) {
        console.log("Payload UPDATE:", form);

        const { error } = await supabase
          .from("contratos")
          .update(form)
          .eq("id", contratoId);

        if (error) throw error;

        setMessage({ type: "success", text: "Contrato actualizado correctamente." });
      } else {
        console.log("Payload INSERT:", form);

        const { data, error } = await supabase
          .from("contratos")
          .insert(form)
          .select("id")
          .single();

        if (error) throw error;

        setContratoId(data.id);
        setMessage({ type: "success", text: "Contrato guardado correctamente." });
      }
    } catch (error) {
      logSupabaseError(error);

      const text =
        error instanceof Error ? error.message : "No se pudo guardar el contrato.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="nombre" className="block text-sm font-medium text-zinc-700">
            Número de contrato
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            value={form.nombre}
            onChange={(event) => handleChange("nombre", event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="entidad" className="block text-sm font-medium text-zinc-700">
            Entidad
          </label>
          <input
            id="entidad"
            name="entidad"
            type="text"
            required
            value={form.entidad}
            onChange={(event) => handleChange("entidad", event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="objeto_contractual"
          className="block text-sm font-medium text-zinc-700"
        >
          Objeto contractual
        </label>
        <textarea
          id="objeto_contractual"
          name="objeto_contractual"
          required
          rows={4}
          value={form.objeto_contractual}
          onChange={(event) => handleChange("objeto_contractual", event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="obligaciones" className="block text-sm font-medium text-zinc-700">
          Obligaciones contractuales
        </label>
        <textarea
          id="obligaciones"
          name="obligaciones"
          required
          rows={12}
          value={form.obligaciones}
          onChange={(event) => handleChange("obligaciones", event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-7 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
        <p className="text-sm leading-6 text-zinc-500">
          Las obligaciones contractuales serán utilizadas por la IA para clasificar
          automáticamente las actividades registradas.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar contrato"}
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
