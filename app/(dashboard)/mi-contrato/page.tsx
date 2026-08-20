import ContratoForm from "@/components/contrato-form";
import { createClient } from "@/lib/supabase/server";
import type { Contrato } from "@/types/contrato";

async function getContratoActivo(): Promise<Contrato | null> {
  try {
    console.log(
      "URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

    console.log(
      "KEY:",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 25)
    );

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contratos")
      .select("id, nombre, entidad, objeto_contractual, obligaciones")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error Supabase:", error);
      return null;
    }

    console.log("Contrato encontrado:", data);

    return data;
  } catch (error) {
    console.error("Error al consultar contrato:", error);
    return null;
  }
}

export default async function MiContratoPage() {
  const contrato = await getContratoActivo();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">Mi Contrato</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Administra la información del contrato activo utilizado por AIAC.
        </p>
      </header>

      <ContratoForm contrato={contrato} />
    </div>
  );
}