"use client";

type ConfirmarAccionModalProps = {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  confirmarEtiqueta?: string;
  cancelarEtiqueta?: string;
  confirmando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export default function ConfirmarAccionModal({
  abierto,
  titulo,
  descripcion,
  confirmarEtiqueta = "Confirmar",
  cancelarEtiqueta = "Cancelar",
  confirmando = false,
  onConfirmar,
  onCancelar,
}: ConfirmarAccionModalProps) {
  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar confirmación"
        onClick={onCancelar}
        disabled={confirmando}
        className="absolute inset-0 bg-zinc-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-accion-titulo"
        className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <h2 id="confirmar-accion-titulo" className="text-lg font-semibold text-zinc-900">
          {titulo}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{descripcion}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancelar}
            disabled={confirmando}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {cancelarEtiqueta}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={confirmando}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {confirmando ? "Eliminando..." : confirmarEtiqueta}
          </button>
        </div>
      </div>
    </div>
  );
}
