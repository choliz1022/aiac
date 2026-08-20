export type AppNavItem = {
  href: string;
  label: string;
};

export const AUDITORIA_OBLIGACIONES_HREF = "/auditoria-obligaciones";

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/mi-contrato", label: "Mi Contrato" },
  { href: "/registrar-actividad", label: "Registrar Actividad" },
  { href: "/historial", label: "Historial" },
  { href: "/informe-mensual", label: "Informe Mensual" },
  { href: "/configuracion-ia", label: "Configuración IA" },
  { href: AUDITORIA_OBLIGACIONES_HREF, label: "Auditoría de obligaciones" },
];
