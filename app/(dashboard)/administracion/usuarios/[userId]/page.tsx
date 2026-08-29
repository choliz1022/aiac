import Link from "next/link";
import AdminUsuarioDetalle from "@/components/admin-usuario-detalle";
import { listarPlanesCatalogo, obtenerUsuarioAdminDetalle } from "@/lib/admin-usuarios";
import { esAdmin, esStaff } from "@/lib/roles";
import { redirect } from "next/navigation";

type AdminUsuarioPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUsuarioPage({ params }: AdminUsuarioPageProps) {
  if (!(await esStaff())) {
    redirect("/");
  }

  const { userId } = await params;
  const [resultado, planes, callerEsAdmin] = await Promise.all([
    obtenerUsuarioAdminDetalle(userId),
    listarPlanesCatalogo(),
    esAdmin(),
  ]);

  if (!resultado.success) {
    return (
      <div className="mx-auto max-w-4xl">
        <Link href="/administracion" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Volver a usuarios
        </Link>
        <p className="mt-6 text-sm text-red-600">{resultado.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/administracion"
        className="inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Volver a usuarios
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-semibold text-zinc-900">{resultado.usuario.email}</h1>
        <p className="mt-2 text-sm text-zinc-600">Detalle y gestión del usuario</p>
      </header>

      <AdminUsuarioDetalle
        usuario={resultado.usuario}
        planes={planes}
        callerEsAdmin={callerEsAdmin}
      />
    </div>
  );
}
