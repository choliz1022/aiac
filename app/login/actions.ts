"use server";

import { createClient } from "@/lib/supabase/server";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

export async function iniciarSesion(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const email = input.email.trim();
  const password = input.password;

  if (!email) {
    return { success: false, error: "El correo es obligatorio." };
  }

  if (!password) {
    return { success: false, error: "La contraseña es obligatoria." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function registrarUsuario(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const email = input.email.trim();
  const password = input.password;

  if (!email) {
    return { success: false, error: "El correo es obligatorio." };
  }

  if (password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
