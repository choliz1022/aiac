import { getContratoActivoId } from "@/lib/contrato-activo";
import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionIA, ConfiguracionIAContext } from "@/types/configuracion-ia";

const CONFIGURACION_IA_SELECT =
  "id, contrato_id, estilo_redaccion, ejemplos_redaccion, instrucciones_informe, contexto_tecnico, created_at, updated_at";

export async function getConfiguracionIA(
  contratoId?: string | null
): Promise<ConfiguracionIA | null> {
  const resolvedContratoId = contratoId ?? (await getContratoActivoId());

  if (!resolvedContratoId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracion_ia")
    .select(CONFIGURACION_IA_SELECT)
    .eq("contrato_id", resolvedContratoId)
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

export function combinarTextoReglasConfiguracion(
  configuracion?: Pick<
    ConfiguracionIAContext,
    "instrucciones_informe" | "contexto_tecnico" | "estilo_redaccion" | "ejemplos_redaccion"
  > | null
): string {
  if (!configuracion) {
    return "";
  }

  return [
    configuracion.instrucciones_informe,
    configuracion.contexto_tecnico,
    configuracion.estilo_redaccion,
    configuracion.ejemplos_redaccion,
  ]
    .map((texto) => texto?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}
