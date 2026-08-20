import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionIA, ConfiguracionIAContext } from "@/types/configuracion-ia";

export async function getConfiguracionIA(): Promise<ConfiguracionIA | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracion_ia")
    .select(
      "id, estilo_redaccion, ejemplos_redaccion, instrucciones_informe, contexto_tecnico, created_at, updated_at"
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function toConfiguracionIAContext(
  configuracion: ConfiguracionIA | null
): ConfiguracionIAContext | null {
  if (!configuracion) {
    return null;
  }

  const contexto_tecnico = configuracion.contexto_tecnico.trim();
  const instrucciones_informe = configuracion.instrucciones_informe.trim();
  const estilo_redaccion = configuracion.estilo_redaccion.trim();
  const ejemplos_redaccion = configuracion.ejemplos_redaccion.trim();

  if (
    !contexto_tecnico &&
    !instrucciones_informe &&
    !estilo_redaccion &&
    !ejemplos_redaccion
  ) {
    return null;
  }

  return {
    contexto_tecnico,
    instrucciones_informe,
    estilo_redaccion,
    ejemplos_redaccion,
  };
}
