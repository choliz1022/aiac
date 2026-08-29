import type { ReactNode } from "react";
import AppSidebar from "@/components/app-sidebar";
import type { ResumenSidebar } from "@/lib/resumen-sidebar";
import type { ContratoListado } from "@/types/contrato-activo";

type AppShellProps = {
  children: ReactNode;
  resumenSidebar: ResumenSidebar;
  userEmail: string;
  contratos: ContratoListado[];
  contratoActivoId: string | null;
  mostrarAdministracion?: boolean;
};

export default function AppShell({
  children,
  resumenSidebar,
  userEmail,
  contratos,
  contratoActivoId,
  mostrarAdministracion = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AppSidebar
          resumenSidebar={resumenSidebar}
          userEmail={userEmail}
          contratos={contratos}
          contratoActivoId={contratoActivoId}
          mostrarAdministracion={mostrarAdministracion}
        />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
