import RegistrarActividadForm from "@/components/registrar-actividad-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ContratoActivo = {
  id: string;
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
};

function contratoEstaCompleto(contrato: ContratoActivo): boolean {
  return (
    contrato.nombre.trim() !== "" &&
    contrato.entidad.trim() !== "" &&
    contrato.objeto_contractual.trim() !== "" &&
    contrato.obligaciones.trim() !== ""
  );
}

async function getContratoActivo(): Promise<ContratoActivo | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contratos")
      .select("id, nombre, entidad, objeto_contractual, obligaciones")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error al consultar contrato:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error al consultar contrato:", error);
    return null;
  }
}

export default async function RegistrarActividadPage() {
  const contrato = await getContratoActivo();

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
