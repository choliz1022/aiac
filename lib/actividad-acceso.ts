import type { SupabaseClient } from "@supabase/supabase-js";

export type ActividadAcceso = {
  id: string;
  contrato_id: string;
};

export async function obtenerActividadDelUsuario(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string
): Promise<ActividadAcceso | null> {
  const { data, error } = await supabase
    .from("actividades")
    .select("id, contrato_id")
    .eq("id", actividadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.contrato_id) {
    return null;
  }

  return data;
}

export async function actividadPerteneceAlContratoActivo(
  supabase: SupabaseClient,
  actividadId: string,
  userId: string,
  contratoActivoId: string
): Promise<boolean> {
  const actividad = await obtenerActividadDelUsuario(supabase, actividadId, userId);

  return actividad !== null && actividad.contrato_id === contratoActivoId;
}
