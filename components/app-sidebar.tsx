"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cerrarSesion } from "@/app/login/actions";
import { APP_NAV_ITEMS } from "@/lib/navigation";
import type { ResumenSidebar } from "@/lib/resumen-sidebar";

type AppSidebarProps = {
  resumenSidebar: ResumenSidebar;
  userEmail: string;
};

function esRutaActiva(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarResumenOperativo({ resumenSidebar }: { resumenSidebar: ResumenSidebar }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Periodo actual
        </p>
        <p className="mt-1 text-sm font-semibold capitalize text-zinc-900">
          {resumenSidebar.periodoActual}
        </p>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Resumen</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Actividades del mes</dt>
            <dd className="mt-0.5 font-semibold text-zinc-900">
              {resumenSidebar.totalActividadesPeriodo}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Obligaciones utilizadas</dt>
            <dd className="mt-0.5 font-semibold text-zinc-900">
              {resumenSidebar.obligacionesConActividad}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Última actividad registrada</dt>
            <dd className="mt-0.5 text-zinc-900">
              {resumenSidebar.ultimaActividadFecha ? (
                <>
                  <span className="block font-medium">{resumenSidebar.ultimaActividadFecha}</span>
                  {resumenSidebar.ultimaActividadResumen ? (
                    <span className="mt-1 block text-xs leading-5 text-zinc-600">
                      {resumenSidebar.ultimaActividadResumen}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="font-medium">Sin registros</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Estado del informe</dt>
            <dd className="mt-0.5 font-semibold text-zinc-900">
              {resumenSidebar.informeMensualGenerado ? "Sí" : "No"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function SidebarUsuario({
  userEmail,
  onLogout,
  loggingOut,
}: {
  userEmail: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <div className="border-b border-zinc-200 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Usuario
      </p>
      <p className="mt-1 truncate text-sm font-medium text-zinc-900">{userEmail}</p>
      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
      >
        {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>
    </div>
  );
}

function SidebarFooter({ resumenSidebar }: { resumenSidebar: ResumenSidebar }) {
  return <SidebarResumenOperativo resumenSidebar={resumenSidebar} />;
}

export default function AppSidebar({ resumenSidebar, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileAbierto, setMobileAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cerrarMobile = () => setMobileAbierto(false);

  function handleLogout() {
    startTransition(async () => {
      await cerrarSesion();
      router.push("/login");
      router.refresh();
    });
  }

  const contenidoSidebar = (
    <>
      <div className="border-b border-zinc-200 px-5 py-6">
        <Link href="/" className="block" onClick={cerrarMobile}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            AIAC
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">Asistente Contractual</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {APP_NAV_ITEMS.map((item) => {
          const activo = esRutaActiva(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={cerrarMobile}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                activo
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <SidebarUsuario
        userEmail={userEmail}
        onLogout={handleLogout}
        loggingOut={isPending}
      />

      <div className="border-t border-zinc-200 px-5 py-4">
        <SidebarFooter resumenSidebar={resumenSidebar} />
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            AIAC
          </p>
          <p className="text-sm font-medium capitalize text-zinc-900">
            {resumenSidebar.periodoActual}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileAbierto((prev) => !prev)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
          aria-expanded={mobileAbierto}
          aria-label="Abrir menú de navegación"
        >
          Menú
        </button>
      </div>

      {mobileAbierto ? (
        <div className="border-b border-zinc-200 bg-white lg:hidden">
          <div className="flex max-h-[70vh] flex-col overflow-y-auto">{contenidoSidebar}</div>
        </div>
      ) : null}

      <aside className="hidden w-72 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        {contenidoSidebar}
      </aside>
    </>
  );
}
