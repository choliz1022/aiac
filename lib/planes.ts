import { cache } from "react";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type {
  AssertFeatureResult,
  FeatureId,
  PlanEstado,
  PlanUsuario,
  SuscripcionUsuarioRow,
  UsuarioFeatureOverride,
} from "@/types/planes";
import { FEATURE_IDS } from "@/types/planes";

/** Plan por defecto: conserva el acceso actual hasta aplicar migraciones o asignar plan. */
export const PLAN_USUARIO_FALLBACK: PlanUsuario = {
  planId: "early_adopter",
  planNombre: "Early Adopter",
  estado: "activa",
  maxContratos: null,
  features: new Set(FEATURE_IDS),
  inicioEn: new Date(0).toISOString(),
  finEn: null,
};

function suscripcionEstaVigente(estado: PlanEstado, finEn: string | null): boolean {
  if (estado !== "activa") {
    return false;
  }

  if (!finEn) {
    return true;
  }

  return new Date(finEn).getTime() > Date.now();
}

function overrideEstaVigente(override: UsuarioFeatureOverride): boolean {
  if (!override.expira_en) {
    return true;
  }

  return new Date(override.expira_en).getTime() > Date.now();
}

function construirFeaturesDesdePlan(
  suscripcion: SuscripcionUsuarioRow,
  overrides: UsuarioFeatureOverride[]
): Set<string> {
  const features = new Set<string>();
  const planVigente = suscripcionEstaVigente(suscripcion.estado, suscripcion.fin_en);

  if (planVigente && suscripcion.planes?.plan_features) {
    for (const item of suscripcion.planes.plan_features) {
      features.add(item.feature_id);
    }
  }

  for (const override of overrides) {
    if (!overrideEstaVigente(override)) {
      continue;
    }

    if (override.habilitado) {
      features.add(override.feature_id);
    } else {
      features.delete(override.feature_id);
    }
  }

  return features;
}

function mapSuscripcionAPlanUsuario(
  suscripcion: SuscripcionUsuarioRow,
  overrides: UsuarioFeatureOverride[]
): PlanUsuario {
  const plan = suscripcion.planes;

  return {
    planId: suscripcion.plan_id,
    planNombre: plan?.nombre ?? suscripcion.plan_id,
    estado: suscripcion.estado,
    maxContratos: plan?.max_contratos ?? null,
    features: construirFeaturesDesdePlan(suscripcion, overrides),
    inicioEn: suscripcion.inicio_en,
    finEn: suscripcion.fin_en,
  };
}

async function resolverUserId(userId?: string): Promise<string | null> {
  if (userId) {
    return userId;
  }

  try {
    const user = await getAuthenticatedUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function cargarPlanUsuario(userId: string): Promise<PlanUsuario | null> {
  try {
    const supabase = await createClient();

    const [{ data: suscripcion, error: errorSuscripcion }, { data: overrides, error: errorOverrides }] =
      await Promise.all([
        supabase
          .from("suscripciones_usuario")
          .select(
            `
            plan_id,
            estado,
            inicio_en,
            fin_en,
            planes (
              id,
              nombre,
              max_contratos,
              plan_features (
                feature_id
              )
            )
          `
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("usuario_feature_overrides")
          .select("feature_id, habilitado, expira_en")
          .eq("user_id", userId),
      ]);

    if (errorSuscripcion) {
      console.error("Error al consultar suscripción del usuario:", errorSuscripcion);
      return null;
    }

    if (errorOverrides) {
      console.error("Error al consultar overrides de features:", errorOverrides);
      return null;
    }

    if (!suscripcion) {
      return null;
    }

    return mapSuscripcionAPlanUsuario(
      suscripcion as unknown as SuscripcionUsuarioRow,
      (overrides ?? []) as UsuarioFeatureOverride[]
    );
  } catch (error) {
    console.error("Error al cargar plan del usuario:", error);
    return null;
  }
}

const getPlanUsuarioCached = cache(async (userId: string): Promise<PlanUsuario> => {
  const plan = await cargarPlanUsuario(userId);
  return plan ?? PLAN_USUARIO_FALLBACK;
});

/**
 * Plan efectivo del usuario autenticado (o del userId indicado).
 * Sin suscripción en BD devuelve early_adopter para no alterar el comportamiento actual.
 */
export async function getPlanUsuario(userId?: string): Promise<PlanUsuario> {
  const resolvedUserId = await resolverUserId(userId);

  if (!resolvedUserId) {
    return PLAN_USUARIO_FALLBACK;
  }

  return getPlanUsuarioCached(resolvedUserId);
}

export async function usuarioTieneFeature(
  featureId: string,
  userId?: string
): Promise<boolean> {
  const plan = await getPlanUsuario(userId);
  return plan.features.has(featureId);
}

const MENSAJES_FEATURE: Record<FeatureId, string> = {
  informe_contratista:
    "El informe contratista no está incluido en tu plan actual. Contacta soporte si crees que se trata de un error.",
  informe_supervision:
    "El informe de supervisión está disponible en el plan Profesional. Tu plan actual incluye informe contratista.",
  multi_contrato:
    "La gestión de varios contratos activos está disponible en el plan Profesional. Archiva el contrato actual para reemplazarlo, o actualiza tu plan para usar multi-contrato.",
};

export function mensajeFeatureNoDisponible(featureId: FeatureId): string {
  return MENSAJES_FEATURE[featureId];
}

/**
 * Valida que el usuario tenga una feature del plan.
 * Devuelve { ok: false, error } con mensaje amigable si no la tiene.
 */
export async function assertFeature(
  featureId: FeatureId,
  userId?: string
): Promise<AssertFeatureResult> {
  if (await usuarioTieneFeature(featureId, userId)) {
    return { ok: true };
  }

  return { ok: false, error: mensajeFeatureNoDisponible(featureId) };
}

export function mensajeLimiteContratosAlcanzado(
  limite: number,
  tieneMultiContrato: boolean
): string {
  if (limite === 1 && !tieneMultiContrato) {
    return "Tu plan permite un contrato activo. Archiva el contrato actual para crear uno nuevo, o actualiza a Profesional para multi-contrato.";
  }

  if (limite === 1) {
    return "Has alcanzado el límite de un contrato activo en tu plan.";
  }

  return `Has alcanzado el límite de ${limite} contratos activos de tu plan.`;
}

/**
 * Valida que el usuario pueda crear un contrato adicional según su plan.
 */
export async function assertPuedeCrearContrato(userId?: string): Promise<AssertFeatureResult> {
  const { contarContratosActivosUsuario } = await import("@/lib/contrato-activo");
  const [limite, totalActivos, tieneMultiContrato] = await Promise.all([
    getLimiteContratos(userId),
    contarContratosActivosUsuario(),
    usuarioTieneFeature("multi_contrato", userId),
  ]);

  if (limite !== null && totalActivos >= limite) {
    return {
      ok: false,
      error: mensajeLimiteContratosAlcanzado(limite, tieneMultiContrato),
    };
  }

  return { ok: true };
}

/**
 * Límite de contratos permitidos para el usuario.
 * - Sin multi_contrato: 1
 * - Con multi_contrato: max_contratos del plan (null = ilimitado)
 */
export async function getLimiteContratos(userId?: string): Promise<number | null> {
  const plan = await getPlanUsuario(userId);

  if (!plan.features.has("multi_contrato")) {
    return 1;
  }

  return plan.maxContratos;
}
