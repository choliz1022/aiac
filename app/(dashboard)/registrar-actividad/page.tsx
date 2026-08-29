import RegistrarActividadForm from "@/components/registrar-actividad-form";
import { contratoEstaCompleto, getContratoActivoAnalisis } from "@/lib/contrato-activo";
import { redirect } from "next/navigation";

export default async function RegistrarActividadPage() {
  const contrato = await getContratoActivoAnalisis();

  if (!contrato || !contratoEstaCompleto(contrato)) {
    redirect("/mi-contrato");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">Registrar actividad</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Registra tu actividad diaria para su posterior análisis con IA.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <RegistrarActividadForm contratoId={contrato.id} />
      </section>
    </div>
  );
}
