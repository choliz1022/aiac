import MiContratosGestion from "@/components/mi-contratos-gestion";
import {
  getContratoActivo,
  getContratoActivoId,
  listarContratosUsuario,
  obtenerEstadoLimiteContratos,
} from "@/lib/contrato-activo";
import { usuarioTieneFeature } from "@/lib/planes";

export default async function MiContratoPage() {
  const [
    contratoActivoId,
    contratoActivo,
    contratosActivos,
    contratosTodos,
    limiteContratos,
    puedeMultiContrato,
  ] = await Promise.all([
    getContratoActivoId(),
    getContratoActivo(),
    listarContratosUsuario(),
    listarContratosUsuario({ incluirArchivados: true }),
    obtenerEstadoLimiteContratos(),
    usuarioTieneFeature("multi_contrato"),
  ]);

  const esVistaSimple = contratosActivos.length <= 1;
  const tieneArchivados = contratosTodos.some((contrato) => contrato.estado === "archivado");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">
          {esVistaSimple ? "Mi Contrato" : "Mis Contratos"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {esVistaSimple
            ? "Administra la información del contrato activo utilizado por AIAC."
            : "Administra tus contratos, cambia el activo y configura obligaciones por contrato."}
        </p>
        {!esVistaSimple && contratosActivos.length > 0 ? (
          <p className="mt-1 text-xs text-zinc-500">
            {contratosActivos.length} contratos activos
          </p>
        ) : null}
      </header>

      <MiContratosGestion
        contratos={contratosTodos}
        contratoActivoId={contratoActivoId}
        contratoActivo={contratoActivo}
        limiteContratos={limiteContratos}
        puedeMultiContrato={puedeMultiContrato}
        esVistaSimple={esVistaSimple}
        tieneArchivados={tieneArchivados}
      />
    </div>
  );
}
