"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cambiarContratoActivoAction } from "@/app/(dashboard)/mi-contrato/actions";
import type { ContratoListado } from "@/types/contrato-activo";

type ContratoSelectorProps = {
  contratos: ContratoListado[];
  contratoActivoId: string | null;
};

function etiquetaContrato(contrato: ContratoListado): string {
  if (contrato.alias.trim()) {
    return `${contrato.nombre} · ${contrato.alias.trim()}`;
  }

  return contrato.nombre;
}

export default function ContratoSelector({
  contratos,
  contratoActivoId,
}: ContratoSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const contratosActivos = contratos.filter((contrato) => contrato.estado === "activo");
  const contratoActivo = contratosActivos.find((contrato) => contrato.id === contratoActivoId);

  if (contratosActivos.length === 0) {
    return (
      <div className="border-b border-zinc-200 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Contrato activo
        </p>
        <p className="mt-1 text-sm text-zinc-600">Sin contrato configurado</p>
      </div>
    );
  }

  if (contratosActivos.length === 1) {
    const unico = contratosActivos[0];

    return (
      <div className="border-b border-zinc-200 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Contrato activo
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{unico.nombre}</p>
        {unico.entidad ? (
          <p className="mt-0.5 truncate text-xs text-zinc-600">{unico.entidad}</p>
        ) : null}
      </div>
    );
  }

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoId = event.target.value;

    if (!nuevoId || nuevoId === contratoActivoId) {
      return;
    }

    startTransition(async () => {
      const resultado = await cambiarContratoActivoAction(nuevoId);

      if (resultado.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="border-b border-zinc-200 px-5 py-4">
      <label htmlFor="contrato-activo-selector" className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Contrato activo
      </label>
      <select
        id="contrato-activo-selector"
        value={contratoActivoId ?? ""}
        onChange={handleChange}
        disabled={isPending}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
      >
        {contratosActivos.map((contrato) => (
          <option key={contrato.id} value={contrato.id}>
            {etiquetaContrato(contrato)}
          </option>
        ))}
      </select>
      {contratoActivo?.entidad ? (
        <p className="mt-1 truncate text-xs text-zinc-600">{contratoActivo.entidad}</p>
      ) : null}
      {isPending ? (
        <p className="mt-1 text-xs text-zinc-500">Cambiando contrato...</p>
      ) : null}
    </div>
  );
}
