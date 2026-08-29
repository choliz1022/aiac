"use client";

import { useState } from "react";
import InformeMensualPreview from "@/components/informe-mensual-preview";
import InformeSupervisionPreview from "@/components/informe-supervision-preview";
import { generarInformeMensual } from "@/app/(dashboard)/informe-mensual/actions";
import type { InformeMensualData, TipoInforme } from "@/types/informe-mensual";

type InformeMensualFormProps = {
  anioActual: number;
  puedeInformeSupervision: boolean;
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

export default function InformeMensualForm({
  anioActual,
  puedeInformeSupervision,
}: InformeMensualFormProps) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(anioActual);
  const [tipoInforme, setTipoInforme] = useState<TipoInforme>("contratista");
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
        tipoInforme,
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
      const response = await fetch("/api/informe-mensual/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, anio, tipoInforme }),
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMensaje({
          type: "error",
          text: payload?.error ?? "No se pudo generar el informe en DOCX.",
        });
        return;
      }

      const imagenesEmbebidas = Number(response.headers.get("X-Imagenes-Embedidas") ?? "0");
      const imagenesOmitidas = Number(response.headers.get("X-Imagenes-Omitidas") ?? "0");
      const filenameHeader = response.headers.get("X-Filename");
      const filename = filenameHeader
        ? decodeURIComponent(filenameHeader)
        : "Informe_Mensual.docx";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = filename;
      enlace.click();
      URL.revokeObjectURL(url);

      setMensaje({
        type: "info",
        text:
          imagenesOmitidas > 0
            ? `DOCX descargado con ${imagenesEmbebidas} imagen(es) embebida(s). ${imagenesOmitidas} no pudieron incluirse.`
            : `DOCX descargado con ${imagenesEmbebidas} imagen(es) embebida(s).`,
      });
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

          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-zinc-700">Tipo de informe</legend>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  name="tipoInforme"
                  value="contratista"
                  checked={tipoInforme === "contratista"}
                  onChange={() => setTipoInforme("contratista")}
                  className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                />
                Contratista
              </label>
              <label
                className={`inline-flex items-center gap-2 text-sm ${
                  puedeInformeSupervision
                    ? "cursor-pointer text-zinc-800"
                    : "cursor-not-allowed text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="tipoInforme"
                  value="supervision"
                  checked={tipoInforme === "supervision"}
                  disabled={!puedeInformeSupervision}
                  onChange={() => setTipoInforme("supervision")}
                  className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-300 disabled:opacity-60"
                />
                Supervisión
              </label>
            </div>
            {!puedeInformeSupervision ? (
              <p className="text-sm text-zinc-500">
                El informe de supervisión está disponible en el plan Profesional. Tu plan actual
                incluye informe contratista.
              </p>
            ) : null}
          </fieldset>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={generando}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generando ? "Generando informe..." : "Generar informe"}
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
            {informe.tipoInforme === "supervision" ? (
              <InformeSupervisionPreview informe={informe} />
            ) : (
              <InformeMensualPreview informe={informe} />
            )}
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
