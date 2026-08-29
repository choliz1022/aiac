export const FEATURE_IDS = [
  "informe_contratista",
  "informe_supervision",
  "multi_contrato",
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export const PLAN_IDS = ["basico", "profesional", "early_adopter"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type PlanEstado = "activa" | "suspendida" | "cancelada";

export type PlanUsuario = {
  planId: string;
  planNombre: string;
  estado: PlanEstado;
  maxContratos: number | null;
  features: ReadonlySet<string>;
  inicioEn: string;
  finEn: string | null;
};

export type UsuarioFeatureOverride = {
  feature_id: string;
  habilitado: boolean;
  expira_en: string | null;
};

export type SuscripcionUsuarioRow = {
  plan_id: string;
  estado: PlanEstado;
  inicio_en: string;
  fin_en: string | null;
  planes: {
    id: string;
    nombre: string;
    max_contratos: number | null;
    plan_features: { feature_id: string }[];
  } | null;
};

export type AssertFeatureResult = { ok: true } | { ok: false; error: string };
