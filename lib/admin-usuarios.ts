import { getPlanUsuario } from "@/lib/planes";
import { requireStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminUsuarioDetalle,
  AdminUsuarioListado,
  PlanCatalogoItem,
} from "@/types/admin";
import type { PlanEstado } from "@/types/planes";
import type { UserRole } from "@/types/roles";
import { USER_ROLES } from "@/types/roles";

function normalizarRol(valor: string): UserRole {
  return USER_ROLES.includes(valor as UserRole) ? (valor as UserRole) : "user";
}

function normalizarEstadoSuscripcion(valor: string): PlanEstado {
  if (valor === "suspendida" || valor === "cancelada") {
    return valor;
  }

  return "activa";
}

export async function listarUsuariosAdmin(): Promise<
  { success: true; usuarios: AdminUsuarioListado[] } | { success: false; error: string }
> {
  const staff = await requireStaff();

  if (!staff.ok) {
    return { success: false, error: staff.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_listar_usuarios");

  if (error) {
    return { success: false, error: error.message };
  }

  const usuarios = ((data ?? []) as Record<string, unknown>[]).map((fila) => ({
    user_id: String(fila.user_id),
    email: String(fila.email ?? ""),
    plan_id: String(fila.plan_id ?? "early_adopter"),
    plan_nombre: String(fila.plan_nombre ?? "Early Adopter"),
    rol: normalizarRol(String(fila.rol ?? "user")),
    estado_suscripcion: normalizarEstadoSuscripcion(String(fila.estado_suscripcion ?? "activa")),
    total_contratos: Number(fila.total_contratos ?? 0),
    registrado_en: String(fila.registrado_en ?? ""),
  }));

  return { success: true, usuarios };
}

export async function obtenerUsuarioAdminDetalle(
  userId: string
): Promise<
  { success: true; usuario: AdminUsuarioDetalle } | { success: false; error: string }
> {
  const staff = await requireStaff();

  if (!staff.ok) {
    return { success: false, error: staff.error };
  }

  const userIdLimpio = userId.trim();

  if (!userIdLimpio) {
    return { success: false, error: "Usuario no válido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_obtener_usuario", {
    p_target_user_id: userIdLimpio,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Usuario no encontrado." };
  }

  const registro = data as Record<string, unknown>;
  const planEfectivo = await getPlanUsuario(userIdLimpio);

  const contratos = Array.isArray(registro.contratos)
    ? registro.contratos.map((item) => {
        const contrato = item as Record<string, unknown>;
        return {
          id: String(contrato.id ?? ""),
          nombre: String(contrato.nombre ?? ""),
          entidad: String(contrato.entidad ?? ""),
          alias: String(contrato.alias ?? ""),
          estado: String(contrato.estado ?? ""),
          created_at: String(contrato.created_at ?? ""),
        };
      })
    : [];

  return {
    success: true,
    usuario: {
      user_id: String(registro.user_id ?? userIdLimpio),
      email: String(registro.email ?? ""),
      registrado_en: String(registro.registrado_en ?? ""),
      rol: normalizarRol(String(registro.rol ?? "user")),
      plan_id: String(registro.plan_id ?? planEfectivo.planId),
      plan_nombre: String(registro.plan_nombre ?? planEfectivo.planNombre),
      estado_suscripcion: normalizarEstadoSuscripcion(
        String(registro.estado_suscripcion ?? planEfectivo.estado)
      ),
      inicio_en: registro.inicio_en ? String(registro.inicio_en) : null,
      fin_en: registro.fin_en ? String(registro.fin_en) : null,
      total_contratos: Number(registro.total_contratos ?? contratos.length),
      contratos,
      features_efectivas: [...planEfectivo.features],
      plan_efectivo_nombre: planEfectivo.planNombre,
    },
  };
}

export async function listarPlanesCatalogo(): Promise<PlanCatalogoItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planes")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    console.error("Error al listar planes:", error);
    return [];
  }

  return (data ?? []).map((plan) => ({
    id: plan.id,
    nombre: plan.nombre,
  }));
}

async function ejecutarRpcAdmin(
  nombre: string,
  parametros: Record<string, unknown>
): Promise<{ success: true } | { success: false; error: string }> {
  const staff = await requireStaff();

  if (!staff.ok) {
    return { success: false, error: staff.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(nombre, parametros);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cambiarPlanUsuarioAdmin(
  userId: string,
  planId: string
): Promise<{ success: true } | { success: false; error: string }> {
  return ejecutarRpcAdmin("admin_cambiar_plan_usuario", {
    p_target_user_id: userId.trim(),
    p_plan_id: planId.trim(),
  });
}

export async function cambiarRolUsuarioAdmin(
  userId: string,
  rol: UserRole
): Promise<{ success: true } | { success: false; error: string }> {
  return ejecutarRpcAdmin("admin_cambiar_rol_usuario", {
    p_target_user_id: userId.trim(),
    p_nuevo_rol: rol,
  });
}

export async function suspenderUsuarioAdmin(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  return ejecutarRpcAdmin("admin_actualizar_estado_suscripcion", {
    p_target_user_id: userId.trim(),
    p_estado: "suspendida",
  });
}

export async function reactivarUsuarioAdmin(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  return ejecutarRpcAdmin("admin_actualizar_estado_suscripcion", {
    p_target_user_id: userId.trim(),
    p_estado: "activa",
  });
}
