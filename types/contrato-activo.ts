export const CONTRATO_ACTIVO_COOKIE = "aiac_contrato_activo";

export type ContratoEstado = "activo" | "archivado";

export type ContratoActivoResumen = {
  id: string;
  nombre: string;
  entidad: string;
};

export type ContratoListado = ContratoActivoResumen & {
  alias: string;
  estado: ContratoEstado;
  created_at: string;
};

export type ContratoActivoAnalisis = {
  id: string;
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
};

export type SetContratoActivoResult =
  | { success: true }
  | { success: false; error: string };

export type ArchivarContratoResult =
  | { success: true; nuevoContratoActivoId: string | null }
  | { success: false; error: string };

export type EstadoLimiteContratos = {
  totalActivos: number;
  limite: number | null;
  enLimite: boolean;
  mensajeAdvertencia: string | null;
};

export type ContratoActivo = ContratoActivoAnalisis;

export type ListarContratosOpciones = {
  incluirArchivados?: boolean;
};
