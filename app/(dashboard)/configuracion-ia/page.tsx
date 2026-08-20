import ConfiguracionIAForm from "@/components/configuracion-ia-form";
import RespaldoAiacPanel from "@/components/respaldo-aiac-panel";
import { getConfiguracionIA } from "@/lib/configuracion-ia";

export default async function ConfiguracionIAPage() {
  let configuracion = null;
  let error: string | null = null;

  try {
    configuracion = await getConfiguracionIA();
  } catch (loadError) {
    console.error("Error al consultar configuracion IA:", loadError);
    error =
      loadError instanceof Error
        ? loadError.message
        : "No se pudo cargar la configuración IA.";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Configuración IA</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Personaliza el estilo de redacción que AIAC utilizará al analizar tus actividades.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <ConfiguracionIAForm configuracion={configuracion} />
        )}
      </section>

      <RespaldoAiacPanel />
    </div>
  );
}
