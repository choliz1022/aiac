import Link from "next/link";
import type { AdminUsuarioListado } from "@/types/admin";
import { USER_ROLE_LABELS } from "@/types/roles";

type AdminUsuariosTableProps = {
  usuarios: AdminUsuarioListado[];
};

function formatearFecha(iso: string): string {
  if (!iso) {
    return "—";
  }

  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) {
    return "—";
  }

  return fecha.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case "activa":
      return "Activa";
    case "suspendida":
      return "Suspendida";
    case "cancelada":
      return "Cancelada";
    default:
      return estado;
  }
}

function claseEstado(estado: string): string {
  switch (estado) {
    case "activa":
      return "bg-emerald-100 text-emerald-800";
    case "suspendida":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

export default function AdminUsuariosTable({ usuarios }: AdminUsuariosTableProps) {
  if (usuarios.length === 0) {
    return <p className="text-sm text-zinc-600">No hay usuarios registrados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-3">Correo</th>
            <th className="px-3 py-3">Plan</th>
            <th className="px-3 py-3">Rol</th>
            <th className="px-3 py-3">Suscripción</th>
            <th className="px-3 py-3">Contratos</th>
            <th className="px-3 py-3">Registro</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {usuarios.map((usuario) => (
            <tr key={usuario.user_id} className="text-zinc-800">
              <td className="px-3 py-3 font-medium">{usuario.email}</td>
              <td className="px-3 py-3">{usuario.plan_nombre}</td>
              <td className="px-3 py-3">{USER_ROLE_LABELS[usuario.rol]}</td>
              <td className="px-3 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${claseEstado(usuario.estado_suscripcion)}`}
                >
                  {etiquetaEstado(usuario.estado_suscripcion)}
                </span>
              </td>
              <td className="px-3 py-3">{usuario.total_contratos}</td>
              <td className="px-3 py-3">{formatearFecha(usuario.registrado_en)}</td>
              <td className="px-3 py-3 text-right">
                <Link
                  href={`/administracion/usuarios/${usuario.user_id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  Gestionar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
