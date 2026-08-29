import AdminUsuariosTable from "@/components/admin-usuarios-table";
import { listarUsuariosAdmin } from "@/lib/admin-usuarios";
import { esStaff } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function AdministracionPage() {
  if (!(await esStaff())) {
    redirect("/");
  }

  const resultado = await listarUsuariosAdmin();

  if (!resultado.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-900">Administración</h1>
        </header>
        <p className="text-sm text-red-600">{resultado.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900">Administración</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Gestiona usuarios, planes y roles de la plataforma AIAC.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Usuarios</h2>
          <p className="text-sm text-zinc-500">{resultado.usuarios.length} registrados</p>
        </div>

        <AdminUsuariosTable usuarios={resultado.usuarios} />
      </section>

      <p className="mt-6 text-sm text-zinc-500">
        Selecciona un usuario para ver detalle, cambiar plan, rol o estado de suscripción.
      </p>
    </div>
  );
}
