import AppShell from "@/components/app-shell";
import { getResumenSidebar } from "@/lib/resumen-sidebar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resumenSidebar = await getResumenSidebar();

  return (
    <AppShell
      resumenSidebar={resumenSidebar}
      userEmail={user?.email ?? "Usuario"}
    >
      {children}
    </AppShell>
  );
}
