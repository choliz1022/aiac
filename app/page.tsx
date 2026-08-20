import Link from "next/link";
import { APP_NAV_ITEMS } from "@/lib/navigation";
import { getContratoActivoResumen, getPeriodoActual } from "@/lib/contrato-activo";

export default async function HomePage() {
  const contrato = await getContratoActivoResumen();
  const periodoActual = getPeriodoActual();

  const accesosRapidos = APP_NAV_ITEMS.filter((item) => item.href !== "/");

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">Inicio</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Panel principal de AIAC para gestionar actividades contractuales.
        </p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Contrato activo
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {contrato?.nombre ?? "Sin contrato configurado"}
          </p>
          {contrato?.entidad ? (
            <p className="mt-1 text-sm text-zinc-600">{contrato.entidad}</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Configura tu contrato para comenzar a registrar actividades.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Periodo actual
          </p>
          <p className="mt-2 text-lg font-semibold capitalize text-zinc-900">
            {periodoActual}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Usa este periodo como referencia al generar informes mensuales.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Accesos rápidos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accesosRapidos.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-zinc-200 px-4 py-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auditoria-obligaciones"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
          >
            Auditoría de obligaciones
          </Link>
        </div>
      </section>
    </div>
  );
}
