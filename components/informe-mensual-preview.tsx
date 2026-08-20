import type { InformeMensualData } from "@/types/informe-mensual";

type InformeMensualPreviewProps = {
  informe: InformeMensualData;
};

export default function InformeMensualPreview({ informe }: InformeMensualPreviewProps) {
  return (
    <article className="informe-documento mx-auto max-w-3xl bg-white px-8 py-10 text-zinc-900 shadow-sm ring-1 ring-zinc-200 sm:px-12 sm:py-12">
      <header className="space-y-6 border-b border-zinc-200 pb-8">
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
          <section key={`${obligacion.nombre}-${index}`} className="informe-obligacion space-y-4">
            <div className="border-t border-zinc-300 pt-6">
              <h2 className="text-lg font-semibold uppercase tracking-wide">
                Obligación {index + 1}
              </h2>
              <p className="mt-2 text-sm font-medium text-zinc-700">{obligacion.nombre}</p>
            </div>

            {obligacion.mensajeSinActividades ? (
              <p className="text-sm italic leading-7 text-zinc-600">
                {obligacion.mensajeSinActividades}
              </p>
            ) : (
              <ul className="informe-actividades space-y-4 pl-5">
                {obligacion.actividadesConsolidadas.map((actividad, actividadIndex) => (
                  <li
                    key={`${obligacion.nombre}-${actividad.frente}-${actividadIndex}`}
                    className="informe-actividad list-disc text-sm leading-7 text-zinc-700"
                  >
                    {actividad.redaccion_consolidada}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="informe-resumen border-t border-zinc-200 pt-8">
        <h2 className="text-lg font-semibold">Resumen general</h2>

        <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
          <p>
            <span className="font-semibold">Número total de actividades registradas:</span>{" "}
            {informe.resumen.totalActividades}
          </p>
          <p>
            <span className="font-semibold">Número total de actividades consolidadas:</span>{" "}
            {informe.resumen.totalActividadesConsolidadas}
          </p>
          <p>
            <span className="font-semibold">Número de obligaciones trabajadas:</span>{" "}
            {informe.resumen.totalObligacionesTrabajadas}
          </p>
          <p>
            <span className="font-semibold">Número de proyectos identificados:</span>{" "}
            {informe.resumen.totalProyectos}
          </p>
          <p>
            <span className="font-semibold">Proyecto(s) identificados:</span>{" "}
            {informe.resumen.proyectosIdentificados.length > 0
              ? informe.resumen.proyectosIdentificados.join(", ")
              : "Ninguno"}
          </p>
        </div>
      </footer>
    </article>
  );
}
