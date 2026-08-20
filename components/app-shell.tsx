import type { ReactNode } from "react";
import AppSidebar from "@/components/app-sidebar";
import type { ResumenSidebar } from "@/lib/resumen-sidebar";

type AppShellProps = {
  children: ReactNode;
  resumenSidebar: ResumenSidebar;
  userEmail: string;
};

export default function AppShell({ children, resumenSidebar, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AppSidebar resumenSidebar={resumenSidebar} userEmail={userEmail} />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
