"use server";

import {
  archivarContrato,
  getContratoActivoId,
  getContratoPorId,
  obtenerEstadoLimiteContratos,
  setContratoActivo,
} from "@/lib/contrato-activo";
import { assertPuedeCrearContrato } from "@/lib/planes";
import { createClient } from "@/lib/supabase/server";
import type { Contrato, ContratoFormData } from "@/types/contrato";
import { revalidatePath } from "next/cache";

export type ContratoActionResult =
  | { success: true; contratoId?: string }
  | { success: false; error: string };

function normalizarPayloadContrato(form: ContratoFormData) {
  return {
    nombre: form.nombre.trim(),
    entidad: form.entidad.trim(),
    alias: form.alias?.trim() ?? "",
    objeto_contractual: form.objeto_contractual.trim(),
    obligaciones: form.obligaciones.trim(),
    contratista_nombre: form.contratista_nombre?.trim() ?? "",
    contrato_fecha_inicio: form.contrato_fecha_inicio?.trim() || null,
    contrato_fecha_fin: form.contrato_fecha_fin?.trim() || null,
    supervisor_nombre: form.supervisor_nombre?.trim() ?? "",
    supervisor_cargo: form.supervisor_cargo?.trim() ?? "",
  };
}

function revalidarDashboard() {
  revalidatePath("/", "layout");
}

export async function cambiarContratoActivoAction(
  contratoId: string
): Promise<ContratoActionResult> {
  const resultado = await setContratoActivo(contratoId);

  if (!resultado.success) {
    return resultado;
  }

  revalidarDashboard();
  return { success: true, contratoId: contratoId.trim() };
}

export async function crearContratoAction(
  form: ContratoFormData
): Promise<ContratoActionResult> {
  const payload = normalizarPayloadContrato(form);

  if (!payload.nombre || !payload.entidad || !payload.objeto_contractual || !payload.obligaciones) {
    return { success: false, error: "Completa los campos obligatorios del contrato." };
  }

  const gateCrear = await assertPuedeCrearContrato();

  if (!gateCrear.ok) {
    return { success: false, error: gateCrear.error };
  }

  const supabase = await createClient();
  const { data: contratoInsertado, error: errorContrato } = await supabase
    .from("contratos")
    .insert({ ...payload, estado: "activo" })
    .select("id")
    .single();

  if (errorContrato || !contratoInsertado) {
    return {
      success: false,
      error: errorContrato?.message ?? "No se pudo crear el contrato.",
    };
  }

  const { error: errorConfig } = await supabase.from("configuracion_ia").insert({
    contrato_id: contratoInsertado.id,
    estilo_redaccion: "",
    ejemplos_redaccion: "",
    instrucciones_informe: "",
    contexto_tecnico: "",
  });

  if (errorConfig) {
    return {
      success: false,
      error: errorConfig.message,
    };
  }

  const activacion = await setContratoActivo(contratoInsertado.id);

  if (!activacion.success) {
    return activacion;
  }

  revalidarDashboard();
  return { success: true, contratoId: contratoInsertado.id };
}

export async function actualizarContratoAction(
  contratoId: string,
  form: ContratoFormData
): Promise<ContratoActionResult> {
  const contratoIdLimpio = contratoId.trim();
  const payload = normalizarPayloadContrato(form);

  if (!contratoIdLimpio) {
    return { success: false, error: "El contrato indicado no es válido." };
  }

  if (!payload.nombre || !payload.entidad || !payload.objeto_contractual || !payload.obligaciones) {
    return { success: false, error: "Completa los campos obligatorios del contrato." };
  }

  const contrato = await getContratoPorId(contratoIdLimpio);

  if (!contrato) {
    return { success: false, error: "El contrato no existe o no pertenece a tu cuenta." };
  }

  if (contrato.estado === "archivado") {
    return { success: false, error: "No puedes editar un contrato archivado." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos")
    .update(payload)
    .eq("id", contratoIdLimpio);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidarDashboard();
  return { success: true, contratoId: contratoIdLimpio };
}

export async function archivarContratoAction(contratoId: string): Promise<ContratoActionResult> {
  const activoId = await getContratoActivoId();
  const resultado = await archivarContrato(contratoId);

  if (!resultado.success) {
    return resultado;
  }

  revalidarDashboard();
  return {
    success: true,
    contratoId: resultado.nuevoContratoActivoId ?? activoId ?? undefined,
  };
}

export async function obtenerEstadoLimiteContratosAction() {
  return obtenerEstadoLimiteContratos();
}

export async function obtenerContratoDetalleAction(
  contratoId: string
): Promise<Contrato | null> {
  return getContratoPorId(contratoId);
}
