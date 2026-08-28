import type { InformeMensualActividadFila, InformeMensualData } from "@/types/informe-mensual";

type InformeMensualPreviewProps = {
  informe: InformeMensualData;
};

function obtenerRedaccionesActividad(actividad: InformeMensualActividadFila): string[] {
  return actividad.redacciones_ia ?? [actividad.redaccion_ia];
}

export default function InformeMensualPreview({ informe }: InformeMensualPreviewProps) {
  return (
    <article
      className="informe-documento mx-auto max-w-4xl bg-white px-8 py-10 text-zinc-900 shadow-sm ring-1 ring-zinc-200 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0 sm:px-12 sm:py-12"
      data-informe-formato="contractual"
    >
      <header className="informe-encabezado space-y-6 border-b border-zinc-200 pb-8 print:break-after-avoid">
        <h1 className="text-center text-2xl font-bold uppercase tracking-wide">
          Informe mensual de actividades
        </h1>

        <div className="space-y-3 text-sm leading-7">
          <p>
            <span className="font-semibold">Contrato:</span> {informe.contrato.nombre}
          </p>
          <p>
            <span className="font-semibold">Entidad:</span> {informe.contrato.entidad}
          </p>
          <p>
            <span className="font-semibold">Objeto contractual:</span>{" "}
            {informe.contrato.objeto_contractual}
          </p>
          <p>
            <span className="font-semibold">Periodo:</span> {informe.periodo.etiqueta}
          </p>
        </div>
      </header>

      <div className="space-y-10 py-8">
        {informe.obligaciones.map((obligacion, index) => (
          <section
            key={`${obligacion.nombre}-${index}`}
            className="informe-obligacion space-y-4 print:break-inside-avoid"
            data-obligacion-index={index + 1}
          >
            <header className="border-t border-zinc-300 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Obligación contractual
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-900">
                {obligacion.nombre}
              </p>
            </header>

            {obligacion.mensajeSinActividades ? (
              <p className="text-sm italic leading-7 text-zinc-600">
                {obligacion.mensajeSinActividades}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="informe-tabla-contractual min-w-full border-collapse border border-zinc-300 text-sm">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th
                        scope="col"
                        className="w-1/2 border border-zinc-300 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-800"
                      >
                        Actividades realizadas
                      </th>
                      <th
                        scope="col"
                        className="w-1/2 border border-zinc-300 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-800"
                      >
                        Evidencias
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {obligacion.actividades.map((actividad) => (
                      <tr key={actividad.id} className="informe-fila-actividad align-top">
                        <td className="border border-zinc-300 px-4 py-3 leading-7 text-zinc-800">
                          <div className="space-y-3">
                            {obtenerRedaccionesActividad(actividad).map((redaccion, indice) => (
                              <p key={`${actividad.id}-redaccion-${indice}`} className="whitespace-pre-wrap">
                                {redaccion}
                              </p>
                            ))}
                            <p className="text-xs text-zinc-500">
                              {actividad.fecha_ejecucion_etiqueta}
                            </p>
                          </div>
                        </td>
                        <td className="border border-zinc-300 px-4 py-3">
                          {actividad.evidencias.length > 0 ? (
                            <div className="informe-celda-evidencias flex flex-wrap gap-2">
                              {actividad.evidencias.map((evidencia) =>
                                evidencia.signed_url ? (
                                  <a
                                    key={evidencia.id}
                                    href={evidencia.signed_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block overflow-hidden rounded border border-zinc-200 bg-zinc-50"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={evidencia.signed_url}
                                      alt={evidencia.nombre_archivo}
                                      className="h-24 w-24 object-cover print:h-20 print:w-20"
                                    />
                                  </a>
                                ) : (
                                  <span
                                    key={evidencia.id}
                                    className="text-xs text-zinc-500"
                                  >
                                    {evidencia.nombre_archivo}
                                  </span>
                                )
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
