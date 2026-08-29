"use server";

import { revalidatePath } from "next/cache";
import {
  cambiarPlanUsuarioAdmin,
  cambiarRolUsuarioAdmin,
  reactivarUsuarioAdmin,
  suspenderUsuarioAdmin,
} from "@/lib/admin-usuarios";
import type { AdminActionResult } from "@/types/admin";
import type { UserRole } from "@/types/roles";
import { USER_ROLES } from "@/types/roles";

function revalidarAdministracion(userId?: string) {
  revalidatePath("/administracion");

  if (userId) {
    revalidatePath(`/administracion/usuarios/${userId}`);
  }
}

export async function cambiarPlanUsuarioAction(
  userId: string,
  planId: string
): Promise<AdminActionResult> {
  const resultado = await cambiarPlanUsuarioAdmin(userId, planId);

  if (!resultado.success) {
    return resultado;
  }

  revalidarAdministracion(userId);
  return { success: true };
}

export async function cambiarRolUsuarioAction(
  userId: string,
  rol: string
): Promise<AdminActionResult> {
  if (!USER_ROLES.includes(rol as UserRole)) {
    return { success: false, error: "Rol no válido." };
  }

  const resultado = await cambiarRolUsuarioAdmin(userId, rol as UserRole);

  if (!resultado.success) {
    return resultado;
  }

  revalidarAdministracion(userId);
  return { success: true };
}

export async function suspenderUsuarioAction(userId: string): Promise<AdminActionResult> {
  const resultado = await suspenderUsuarioAdmin(userId);

  if (!resultado.success) {
    return resultado;
  }

  revalidarAdministracion(userId);
  return { success: true };
}

export async function reactivarUsuarioAction(userId: string): Promise<AdminActionResult> {
  const resultado = await reactivarUsuarioAdmin(userId);

  if (!resultado.success) {
    return resultado;
  }

  revalidarAdministracion(userId);
  return { success: true };
}
