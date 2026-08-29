import type { PlanEstado } from "@/types/planes";
import type { UserRole } from "@/types/roles";

export type AdminUsuarioListado = {
  user_id: string;
  email: string;
  plan_id: string;
  plan_nombre: string;
  rol: UserRole;
  estado_suscripcion: PlanEstado;
  total_contratos: number;
  registrado_en: string;
};

export type AdminContratoResumen = {
  id: string;
  nombre: string;
  entidad: string;
  alias: string;
  estado: string;
  created_at: string;
};

export type AdminUsuarioDetalle = {
  user_id: string;
  email: string;
  registrado_en: string;
  rol: UserRole;
  plan_id: string;
  plan_nombre: string;
  estado_suscripcion: PlanEstado;
  inicio_en: string | null;
  fin_en: string | null;
  total_contratos: number;
  contratos: AdminContratoResumen[];
  features_efectivas: string[];
  plan_efectivo_nombre: string;
};

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

export type PlanCatalogoItem = {
  id: string;
  nombre: string;
};
