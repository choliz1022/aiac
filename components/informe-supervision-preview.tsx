import type { InformeMensualData } from "@/types/informe-mensual";
import {
  construirEncabezadoInformeSupervision,
  obtenerFechaActividadSupervision,
  obtenerRedaccionesActividadSupervision,
} from "@/lib/informe-supervision";

type InformeSupervisionPreviewProps = {
  informe: InformeMensualData;
};

function FilaEncabezado({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <p className="text-sm leading-7">
      <span className="font-semibold uppercase tracking-wide">{etiqueta}:</span>{" "}
      <span>{valor}</span>
    </p>
  );
}

export default function InformeSupervisionPreview({ informe }: InformeSupervisionPreviewProps) {
  const encabezado = construirEncabezadoInformeSupervision(informe);
  const supervisorNombre = informe.contrato.supervisor_nombre?.trim() || "________________";
  const supervisorCargo = informe.contrato.supervisor_cargo?.trim();

  return (
    <article
      className="informe-documento mx-auto max-w-4xl bg-white px-8 py-10 text-zinc-900 shadow-sm ring-1 ring-zinc-200 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0 sm:px-12 sm:py-12"
      data-informe-formato="supervision"
    >
      <header className="informe-encabezado space-y-2 border-b border-zinc-200 pb-8 print:break-after-avoid">
        <h1 className="text-center text-xl font-bold uppercase tracking-wide">
          Informe de supervisión No. {encabezado.numeroInforme}
        </h1>

        <div className="space-y-1 pt-4">
          <FilaEncabezado etiqueta="Contrato No." valor={encabezado.numeroContrato} />
          <FilaEncabezado etiqueta="Contratista" valor={encabezado.contratista} />
          <FilaEncabezado etiqueta="Inicio contrato" valor={encabezado.inicioContrato} />
          <FilaEncabezado etiqueta="Fin contrato" valor={encabezado.finContrato} />
          <FilaEncabezado etiqueta="Periodo del informe" valor={encabezado.periodoInforme} />
          <FilaEncabezado etiqueta="Fecha" valor={encabezado.fechaInforme} />
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-sm font-semibold uppercase tracking-wide">Objeto del contrato:</p>
          <p className="text-sm leading-7">
            <span className="font-semibold">Objeto:</span> {encabezado.objetoContractual}
          </p>
        </div>
      </header>

      <section className="py-6 print:break-inside-avoid">
        <p className="text-sm leading-7 text-zinc-900">{encabezado.introduccion}</p>
      </section>

      <section className="space-y-6 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Aspectos supervisados</h2>

        {informe.obligaciones.map((obligacion, index) => (
          <section
            key={`${obligacion.nombre}-${index}`}
            className="informe-obligacion space-y-3 print:break-inside-avoid"
            data-obligacion-index={index + 1}
          >
            <h3 className="text-sm font-bold">Obligación {index + 1}</h3>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-900">
              {obligacion.nombre}
            </p>

            {obligacion.mensajeSinActividades ? (
              <p className="text-sm leading-7 text-zinc-800">
                {obligacion.mensajeSinActividades}
              </p>
            ) : (
              <div className="space-y-4">
                {obligacion.actividades.map((actividad) => (
                  <div key={actividad.id} className="space-y-2">
                    {obtenerRedaccionesActividadSupervision(actividad).map((redaccion, indice) => (
                      <p
                        key={`${actividad.id}-redaccion-${indice}`}
                        className="whitespace-pre-wrap text-sm leading-7 text-zinc-900"
                      >
                        {redaccion}
                      </p>
                    ))}
                    <p className="text-sm leading-7 text-zinc-700">
                      {obtenerFechaActividadSupervision(actividad)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </section>

      <footer className="mt-12 border-t border-zinc-200 pt-10 print:break-inside-avoid">
        <div className="mx-auto max-w-md space-y-1 text-center text-sm leading-7 text-zinc-900">
          <p className="font-medium">{supervisorNombre}</p>
          <p>Supervisor</p>
          {supervisorCargo ? <p>{supervisorCargo}</p> : null}
        </div>
      </footer>
    </article>
  );
}
