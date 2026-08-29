import InformeMensualForm from "@/components/informe-mensual-form";
import { usuarioTieneFeature } from "@/lib/planes";

export default async function InformeMensualPage() {
  const anioActual = new Date().getFullYear();
  const puedeInformeSupervision = await usuarioTieneFeature("informe_supervision");

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">Informe mensual</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Genera una vista previa del informe mensual en formato contractual: obligaciones,
          actividades realizadas y evidencias fotográficas.
        </p>
      </header>

      <InformeMensualForm
        anioActual={anioActual}
        puedeInformeSupervision={puedeInformeSupervision}
      />
    </div>
  );
}
