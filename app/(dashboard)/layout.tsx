import AppShell from "@/components/app-shell";
import {
  getContratoActivoId,
  listarContratosUsuario,
} from "@/lib/contrato-activo";
import { esStaff } from "@/lib/roles";
import { getResumenSidebar } from "@/lib/resumen-sidebar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [resumenSidebar, contratos, contratoActivoId, mostrarAdministracion] = await Promise.all([
    getResumenSidebar(),
    listarContratosUsuario({ incluirArchivados: true }),
    getContratoActivoId(),
    esStaff(),
  ]);

  return (
    <AppShell
      resumenSidebar={resumenSidebar}
      userEmail={user?.email ?? "Usuario"}
      contratos={contratos}
      contratoActivoId={contratoActivoId}
      mostrarAdministracion={mostrarAdministracion}
    >
      {children}
    </AppShell>
  );
}
