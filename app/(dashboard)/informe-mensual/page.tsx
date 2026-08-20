import InformeMensualForm from "@/components/informe-mensual-form";

export default function InformeMensualPage() {
  const anioActual = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">Informe mensual</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Genera una vista previa del informe mensual de actividades contractuales.
        </p>
      </header>

      <InformeMensualForm anioActual={anioActual} />
    </div>
  );
}
