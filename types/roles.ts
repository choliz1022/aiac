export const USER_ROLES = ["admin", "coadmin", "user"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  coadmin: "Co-administrador",
  user: "Usuario",
};
