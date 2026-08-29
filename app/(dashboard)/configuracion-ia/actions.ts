"use server";

import { getContratoActivo, getContratoActivoId } from "@/lib/contrato-activo";
import {
  construirRespaldoAiac,
  parsearRespaldoImportable,
  respaldoImportableAFilas,
} from "@/lib/respaldo-aiac";
import { getConfiguracionIA } from "@/lib/configuracion-ia";
import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionIA } from "@/types/configuracion-ia";
import type { Contrato } from "@/types/contrato";
import type {
  RespaldoAiacDatos,
  RestaurarRespaldoResult,
} from "@/types/respaldo-aiac";

export async function obtenerDatosRespaldoAiac(): Promise<
  | { success: true; datos: RespaldoAiacDatos }
  | { success: false; error: string }
> {
  try {
    const [contrato, configuracion] = await Promise.all([
      getContratoActivo(),
      getConfiguracionIA(),
    ]);

    return {
      success: true,
      datos: construirRespaldoAiac(contrato, configuracion),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron obtener los datos de respaldo.";

    return { success: false, error: message };
  }
}

async function persistirContrato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contratoActual: Contrato | null,
  contrato: {
    nombre: string;
    entidad: string;
    objeto_contractual: string;
    obligaciones: string;
  }
): Promise<void> {
  if (contratoActual) {
    const { error } = await supabase
      .from("contratos")
      .update({
        nombre: contrato.nombre,
        entidad: contrato.entidad,
        objeto_contractual: contrato.objeto_contractual,
        obligaciones: contrato.obligaciones,
      })
      .eq("id", contratoActual.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  throw new Error("No hay un contrato activo al que aplicar el respaldo.");
}

async function persistirConfiguracion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contratoId: string,
  configuracionActual: ConfiguracionIA | null,
  configuracion: {
    instrucciones_informe: string;
    estilo_redaccion: string;
    ejemplos_redaccion: string;
    contexto_tecnico: string;
  }
): Promise<void> {
  if (configuracionActual) {
    const { error } = await supabase
      .from("configuracion_ia")
      .update({
        instrucciones_informe: configuracion.instrucciones_informe,
        estilo_redaccion: configuracion.estilo_redaccion,
        ejemplos_redaccion: configuracion.ejemplos_redaccion,
        contexto_tecnico: configuracion.contexto_tecnico,
      })
      .eq("id", configuracionActual.id)
      .eq("contrato_id", contratoId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("configuracion_ia").insert({
    contrato_id: contratoId,
    instrucciones_informe: configuracion.instrucciones_informe,
    estilo_redaccion: configuracion.estilo_redaccion,
    ejemplos_redaccion: configuracion.ejemplos_redaccion,
    contexto_tecnico: configuracion.contexto_tecnico,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function restaurarRespaldoAiac(data: unknown): Promise<RestaurarRespaldoResult> {
  try {
    const respaldo = parsearRespaldoImportable(data);

    if (!respaldo) {
      return {
        success: false,
        error:
          "El archivo JSON no es un respaldo AIAC válido. Usa un export de configuración IA o respaldo completo.",
      };
    }

    const contratoActivoId = await getContratoActivoId();

    if (!contratoActivoId) {
      return {
        success: false,
        error: "No hay un contrato activo configurado.",
      };
    }

    const [contratoActual, configuracionActual] = await Promise.all([
      getContratoActivo(),
      getConfiguracionIA(contratoActivoId),
    ]);

    const filas = respaldoImportableAFilas(
      respaldo,
      contratoActual?.entidad ?? "",
      configuracionActual?.estilo_redaccion ?? ""
    );

    const supabase = await createClient();

    await persistirContrato(supabase, contratoActual, filas.contrato);
    await persistirConfiguracion(
      supabase,
      contratoActivoId,
      configuracionActual,
      filas.configuracion
    );

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo restaurar el respaldo AIAC.";

    return { success: false, error: message };
  }
}
