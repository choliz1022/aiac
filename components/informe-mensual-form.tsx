"use client";

import { useState } from "react";
import { generarInformeMensual } from "@/app/(dashboard)/informe-mensual/actions";
import InformeMensualPreview from "@/components/informe-mensual-preview";
import { exportarInformeMensualDocx } from "@/lib/exportar-informe-docx";
import type { InformeMensualData } from "@/types/informe-mensual";

type InformeMensualFormProps = {
  anioActual: number;
};

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function InformeMensualForm({ anioActual }: InformeMensualFormProps) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(anioActual);
  const [generando, setGenerando] = useState(false);
  const [descargandoDocx, setDescargandoDocx] = useState(false);
  const [informe, setInforme] = useState<InformeMensualData | null>(null);
  const [mensaje, setMensaje] = useState<{ type: "info" | "error"; text: string } | null>(
    null
  );

  const aniosDisponibles = Array.from({ length: 5 }, (_, index) => anioActual - 2 + index);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerando(true);
    setMensaje(null);
    setInforme(null);

    try {
      const result = await generarInformeMensual({
        mes,
        anio,
      });

      if (!result.success) {
        setMensaje({ type: "error", text: result.error });
        return;
      }

      if ("sinActividades" in result) {
        setMensaje({
          type: "info",
          text: "No existen actividades registradas para este período.",
        });
        return;
      }

      setInforme(result.informe);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo generar el informe mensual.";
      setMensaje({ type: "error", text });
    } finally {
      setGenerando(false);
    }
  }

  async function handleDescargarDocx() {
    if (!informe) {
      return;
    }

    setDescargandoDocx(true);
    setMensaje(null);

    try {
      await exportarInformeMensualDocx(informe);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo descargar el informe en DOCX.";
      setMensaje({ type: "error", text });
    } finally {
      setDescargandoDocx(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="mes" className="block text-sm font-medium text-zinc-700">
                Mes
              </label>
              <select
                id="mes"
                value={mes}
                onChange={(event) => setMes(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                {MESES.map((mesOption) => (
                  <option key={mesOption.value} value={mesOption.value}>
                    {mesOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="anio" className="block text-sm font-medium text-zinc-700">
                Año
              </label>
              <select
                id="anio"
                value={anio}
                onChange={(event) => setAnio(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                {aniosDisponibles.map((anioOption) => (
                  <option key={anioOption} value={anioOption}>
                    {anioOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={generando}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generando ? "Consolidando con IA..." : "Generar informe"}
            </button>

            {mensaje && (
              <p
                className={`text-sm ${
                  mensaje.type === "error" ? "text-red-600" : "text-zinc-600"
                }`}
              >
                {mensaje.text}
              </p>
            )}
          </div>
        </form>
      </section>

      {informe && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 sm:p-6">
            <InformeMensualPreview informe={informe} />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleDescargarDocx}
              disabled={descargandoDocx}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {descargandoDocx ? "Generando DOCX..." : "Descargar DOCX"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
