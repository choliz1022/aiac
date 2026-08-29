import { cache } from "react";
import { cookies } from "next/headers";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Contrato } from "@/types/contrato";
import {
  CONTRATO_ACTIVO_COOKIE,
  type ArchivarContratoResult,
  type ContratoActivoAnalisis,
  type ContratoActivoResumen,
  type ContratoEstado,
  type ContratoListado,
  type EstadoLimiteContratos,
  type ListarContratosOpciones,
  type SetContratoActivoResult,
} from "@/types/contrato-activo";
import { getLimiteContratos, mensajeLimiteContratosAlcanzado, usuarioTieneFeature } from "@/lib/planes";

export {
  CONTRATO_ACTIVO_COOKIE,
  type ArchivarContratoResult,
  type ContratoActivoAnalisis,
  type ContratoActivoResumen,
  type ContratoEstado,
  type ContratoListado,
  type EstadoLimiteContratos,
  type ListarContratosOpciones,
  type SetContratoActivoResult,
} from "@/types/contrato-activo";

const CONTRATO_SELECT_COMPLETO =
  "id, nombre, entidad, alias, estado, objeto_contractual, obligaciones, contratista_nombre, contrato_fecha_inicio, contrato_fecha_fin, supervisor_nombre, supervisor_cargo, created_at";

const CONTRATO_SELECT_ANALISIS =
  "id, nombre, entidad, objeto_contractual, obligaciones";

const CONTRATO_SELECT_LISTADO = "id, nombre, entidad, alias, estado, created_at";

async function obtenerUserIdAutenticado(): Promise<string | null> {
  try {
    const user = await getAuthenticatedUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function contratoEsValidoParaUsuario(
  contratoId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .select("id")
    .eq("id", contratoId)
    .eq("user_id", userId)
    .eq("estado", "activo")
    .maybeSingle();

  return !error && Boolean(data);
}

async function obtenerPrimerContratoActivoId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .select("id")
    .eq("user_id", userId)
    .eq("estado", "activo")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al consultar primer contrato activo:", error);
    return null;
  }

  return data?.id ?? null;
}

async function leerPreferenciaContratoActivoId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preferencias_usuario")
    .select("contrato_activo_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error al consultar preferencias de contrato activo:", error);
    return null;
  }

  return data?.contrato_activo_id ?? null;
}

async function leerCookieContratoActivoId(): Promise<string | null> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(CONTRATO_ACTIVO_COOKIE)?.value?.trim();
  return valor || null;
}

async function resolverContratoActivoId(userId: string): Promise<string | null> {
  const cookieContratoId = await leerCookieContratoActivoId();

  if (cookieContratoId && (await contratoEsValidoParaUsuario(cookieContratoId, userId))) {
    return cookieContratoId;
  }

  const preferenciaContratoId = await leerPreferenciaContratoActivoId(userId);

  if (
    preferenciaContratoId &&
    (await contratoEsValidoParaUsuario(preferenciaContratoId, userId))
  ) {
    return preferenciaContratoId;
  }

  return obtenerPrimerContratoActivoId(userId);
}

const resolverContratoActivoIdCached = cache(async (userId: string): Promise<string | null> => {
  return resolverContratoActivoId(userId);
});

export async function getContratoActivoId(): Promise<string | null> {
  const userId = await obtenerUserIdAutenticado();

  if (!userId) {
    return null;
  }

  return resolverContratoActivoIdCached(userId);
}

async function cargarContratoPorId(
  contratoId: string,
  select: string
): Promise<Contrato | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .select(select)
    .eq("id", contratoId)
    .maybeSingle();

  if (error) {
    console.error("Error al consultar contrato por id:", error);
    return null;
  }

  return data as Contrato | null;
}

export async function getContratoActivo(): Promise<Contrato | null> {
  const contratoId = await getContratoActivoId();

  if (!contratoId) {
    return null;
  }

  return cargarContratoPorId(contratoId, CONTRATO_SELECT_COMPLETO);
}

function toContratoActivoAnalisis(contrato: Contrato): ContratoActivoAnalisis {
  return {
    id: contrato.id,
    nombre: contrato.nombre,
    entidad: contrato.entidad,
    objeto_contractual: contrato.objeto_contractual,
    obligaciones: contrato.obligaciones,
  };
}

export async function getContratoActivoAnalisis(): Promise<ContratoActivoAnalisis | null> {
  const contratoId = await getContratoActivoId();

  if (!contratoId) {
    return null;
  }

  const contrato = await cargarContratoPorId(contratoId, CONTRATO_SELECT_ANALISIS);

  if (!contrato) {
    return null;
  }

  return toContratoActivoAnalisis(contrato);
}

export async function getContratoAnalisisPorId(
  contratoId: string
): Promise<ContratoActivoAnalisis | null> {
  const contrato = await getContratoPorId(contratoId);

  if (!contrato) {
    return null;
  }

  return toContratoActivoAnalisis(contrato);
}

export async function getContratoActivoResumen(): Promise<ContratoActivoResumen | null> {
  const contrato = await getContratoActivo();

  if (!contrato?.nombre?.trim()) {
    return null;
  }

  return {
    id: contrato.id,
    nombre: contrato.nombre,
    entidad: contrato.entidad,
  };
}

export async function listarContratosUsuario(
  opciones: ListarContratosOpciones = {}
): Promise<ContratoListado[]> {
  const userId = await obtenerUserIdAutenticado();

  if (!userId) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("contratos")
    .select(CONTRATO_SELECT_LISTADO)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (!opciones.incluirArchivados) {
    query = query.eq("estado", "activo");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al listar contratos del usuario:", error);
    return [];
  }

  return (data ?? []) as ContratoListado[];
}

export async function contarContratosActivosUsuario(): Promise<number> {
  const contratos = await listarContratosUsuario();
  return contratos.length;
}

export async function obtenerEstadoLimiteContratos(): Promise<EstadoLimiteContratos> {
  const [totalActivos, limite, tieneMultiContrato] = await Promise.all([
    contarContratosActivosUsuario(),
    getLimiteContratos(),
    usuarioTieneFeature("multi_contrato"),
  ]);

  const enLimite = limite !== null && totalActivos >= limite;
  const mensajeAdvertencia = enLimite
    ? mensajeLimiteContratosAlcanzado(limite, tieneMultiContrato)
    : null;

  return {
    totalActivos,
    limite,
    enLimite,
    mensajeAdvertencia,
  };
}

export async function getContratoPorId(contratoId: string): Promise<Contrato | null> {
  const userId = await obtenerUserIdAutenticado();

  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .select(CONTRATO_SELECT_COMPLETO)
    .eq("id", contratoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error al consultar contrato:", error);
    return null;
  }

  return data as Contrato | null;
}

async function reasignarContratoActivoTrasArchivo(
  userId: string,
  contratoArchivadoId: string
): Promise<string | null> {
  const activoId = await getContratoActivoId();

  if (activoId !== contratoArchivadoId) {
    return activoId;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contratos")
    .select("id")
    .eq("user_id", userId)
    .eq("estado", "activo")
    .neq("id", contratoArchivadoId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Error al buscar siguiente contrato activo:", error);
    return null;
  }

  const siguienteId = data?.[0]?.id ?? null;

  if (siguienteId) {
    const resultado = await setContratoActivo(siguienteId);
    return resultado.success ? siguienteId : null;
  }

  await supabase
    .from("preferencias_usuario")
    .upsert({ user_id: userId, contrato_activo_id: null }, { onConflict: "user_id" });

  try {
    const cookieStore = await cookies();
    cookieStore.delete(CONTRATO_ACTIVO_COOKIE);
  } catch {
    // Server Component: la cookie se invalidará en la siguiente acción del usuario.
  }

  return null;
}

export async function archivarContrato(contratoId: string): Promise<ArchivarContratoResult> {
  const contratoIdLimpio = contratoId.trim();

  if (!contratoIdLimpio) {
    return { success: false, error: "El contrato indicado no es válido." };
  }

  const userId = await obtenerUserIdAutenticado();

  if (!userId) {
    return { success: false, error: "Debes iniciar sesión para archivar contratos." };
  }

  const contrato = await getContratoPorId(contratoIdLimpio);

  if (!contrato) {
    return { success: false, error: "El contrato no existe o no pertenece a tu cuenta." };
  }

  if (contrato.estado === "archivado") {
    return { success: false, error: "Este contrato ya está archivado." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contratos")
    .update({ estado: "archivado" })
    .eq("id", contratoIdLimpio)
    .eq("user_id", userId)
    .eq("estado", "activo");

  if (error) {
    return { success: false, error: error.message };
  }

  const nuevoContratoActivoId = await reasignarContratoActivoTrasArchivo(
    userId,
    contratoIdLimpio
  );

  return { success: true, nuevoContratoActivoId };
}

async function persistirPreferenciaContratoActivo(
  userId: string,
  contratoId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("preferencias_usuario").upsert(
    {
      user_id: userId,
      contrato_activo_id: contratoId,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return error.message;
  }

  return null;
}

async function persistirCookieContratoActivo(contratoId: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(CONTRATO_ACTIVO_COOKIE, contratoId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch (error) {
    console.error("No se pudo persistir la cookie de contrato activo:", error);
  }
}

export async function setContratoActivo(contratoId: string): Promise<SetContratoActivoResult> {
  const contratoIdLimpio = contratoId.trim();

  if (!contratoIdLimpio) {
    return { success: false, error: "El contrato indicado no es válido." };
  }

  const userId = await obtenerUserIdAutenticado();

  if (!userId) {
    return { success: false, error: "Debes iniciar sesión para cambiar el contrato activo." };
  }

  const contratoValido = await contratoEsValidoParaUsuario(contratoIdLimpio, userId);

  if (!contratoValido) {
    return {
      success: false,
      error: "El contrato no existe, no está activo o no pertenece a tu cuenta.",
    };
  }

  const errorPreferencia = await persistirPreferenciaContratoActivo(
    userId,
    contratoIdLimpio
  );

  if (errorPreferencia) {
    return {
      success: false,
      error: errorPreferencia,
    };
  }

  await persistirCookieContratoActivo(contratoIdLimpio);

  return { success: true };
}

export function getPeriodoActual(): string {
  const ahora = new Date();

  return ahora.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
}

export function contratoEstaCompleto(contrato: ContratoActivoAnalisis): boolean {
  return (
    contrato.nombre.trim() !== "" &&
    contrato.entidad.trim() !== "" &&
    contrato.objeto_contractual.trim() !== "" &&
    contrato.obligaciones.trim() !== ""
  );
}
