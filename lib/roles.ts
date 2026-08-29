import { cache } from "react";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { UserRole } from "@/types/roles";
import { USER_ROLES } from "@/types/roles";

export type RequireStaffResult =
  | { ok: true; userId: string; rol: UserRole; esAdmin: boolean }
  | { ok: false; error: string };

function normalizarRol(valor: string | null | undefined): UserRole {
  if (valor && USER_ROLES.includes(valor as UserRole)) {
    return valor as UserRole;
  }

  return "user";
}

async function consultarRolUsuario(userId: string): Promise<UserRole> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_rol_usuario", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error al consultar rol de usuario:", error);
    return "user";
  }

  return normalizarRol(typeof data === "string" ? data : null);
}

const getRolUsuarioCached = cache(async (userId: string): Promise<UserRole> => {
  return consultarRolUsuario(userId);
});

export async function getRolUsuario(userId?: string): Promise<UserRole> {
  if (userId) {
    return getRolUsuarioCached(userId);
  }

  try {
    const user = await getAuthenticatedUser();
    return user?.id ? getRolUsuarioCached(user.id) : "user";
  } catch {
    return "user";
  }
}

export async function esStaff(userId?: string): Promise<boolean> {
  const rol = await getRolUsuario(userId);
  return rol === "admin" || rol === "coadmin";
}

export async function esAdmin(userId?: string): Promise<boolean> {
  return (await getRolUsuario(userId)) === "admin";
}

export async function requireStaff(): Promise<RequireStaffResult> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return { ok: false, error: "Debes iniciar sesión." };
    }

    const rol = await getRolUsuario(user.id);

    if (rol !== "admin" && rol !== "coadmin") {
      return { ok: false, error: "No tienes permiso para acceder a la administración." };
    }

    return {
      ok: true,
      userId: user.id,
      rol,
      esAdmin: rol === "admin",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sesión no válida.";
    return { ok: false, error: message };
  }
}

export async function requireAdmin(): Promise<RequireStaffResult> {
  const staff = await requireStaff();

  if (!staff.ok) {
    return staff;
  }

  if (!staff.esAdmin) {
    return { ok: false, error: "Solo un administrador puede realizar esta acción." };
  }

  return staff;
}
