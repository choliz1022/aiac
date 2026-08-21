"use server";

import { eliminarActividadCompleta } from "@/lib/eliminar-actividad";
import {
  actualizarActividadConReanalisis,
  eliminarEvidenciaDeActividad,
  guardarReferenciasEvidenciasActividad,
} from "@/lib/gestion-actividad";
import { createClient } from "@/lib/supabase/server";
import type { EvidenciaReferenciaInput } from "@/types/analisis-actividad";
import type {
  ActualizarActividadResult,
  EliminarActividadResult,
  EliminarEvidenciaActividadResult,
  GuardarEvidenciasActividadResult,
} from "@/types/actividad";

async function obtenerUsuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}

export async function actualizarActividad(input: {
  actividadId: string;
  fecha: string;
  actividad: string;
}): Promise<ActualizarActividadResult> {
  try {
    const { supabase, user } = await obtenerUsuarioAutenticado();

    if (!user) {
      return { success: false, error: "Debes iniciar sesión para editar actividades." };
    }

    const resultado = await actualizarActividadConReanalisis(
      supabase,
      input.actividadId,
      user.id,
      {
        fecha: input.fecha,
        actividad_original: input.actividad,
      }
    );

    if (!resultado.success) {
      return resultado;
    }

    return {
      success: true,
      actividad: resultado.actividad,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la actividad.";

    return { success: false, error: message };
  }
}

export async function guardarEvidenciasActividad(input: {
  actividadId: string;
  evidencias: EvidenciaReferenciaInput[];
}): Promise<GuardarEvidenciasActividadResult> {
  try {
    const { supabase, user } = await obtenerUsuarioAutenticado();

    if (!user) {
      return { success: false, error: "Debes iniciar sesión para agregar evidencias." };
    }

    const resultado = await guardarReferenciasEvidenciasActividad(
      supabase,
      input.actividadId,
      user.id,
      input.evidencias
    );

    if (!resultado.success) {
      return resultado;
    }

    return {
      success: true,
      evidencias_agregadas: resultado.evidencias_count,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron guardar las evidencias.";

    return { success: false, error: message };
  }
}

export async function eliminarEvidenciaActividad(input: {
  actividadId: string;
  evidenciaId: string;
}): Promise<EliminarEvidenciaActividadResult> {
  try {
    const { supabase, user } = await obtenerUsuarioAutenticado();

    if (!user) {
      return { success: false, error: "Debes iniciar sesión para eliminar evidencias." };
    }

    return eliminarEvidenciaDeActividad(
      supabase,
      input.actividadId,
      user.id,
      input.evidenciaId
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la evidencia.";

    return { success: false, error: message };
  }
}

export async function eliminarActividad(actividadId: string): Promise<EliminarActividadResult> {
  try {
    const { supabase, user } = await obtenerUsuarioAutenticado();

    if (!user) {
      return { success: false, error: "Debes iniciar sesión para eliminar actividades." };
    }

    const resultado = await eliminarActividadCompleta(supabase, actividadId, user.id);

    if (!resultado.success) {
      return { success: false, error: resultado.error };
    }

    return {
      success: true,
      archivos_eliminados: resultado.archivosEliminados,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la actividad.";

    return { success: false, error: message };
  }
}
