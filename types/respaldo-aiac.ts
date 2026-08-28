export const RESPALDO_AIAC_VERSION = 1 as const;

export type RespaldoContratoPayload = {
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
};

export type RespaldoConfiguracionIAPayload = {
  instrucciones_informe: string;
  estilo_redaccion: string;
  ejemplos_redaccion: string;
  contexto_tecnico: string;
};

export type RespaldoAiacCompleto = {
  version: typeof RESPALDO_AIAC_VERSION;
  tipo: "respaldo_aiac";
  exportado_en: string;
  contrato: RespaldoContratoPayload;
  configuracion_ia: RespaldoConfiguracionIAPayload;
};

export type ExportConfiguracionIAJson = {
  version: typeof RESPALDO_AIAC_VERSION;
  tipo: "configuracion_ia";
  exportado_en: string;
  contrato: string;
  objeto_contractual: string;
  obligaciones: string;
  instrucciones_informe: string;
  estilo_redaccion: string;
  ejemplos_redaccion: string;
  contexto_tecnico: string;
};

export type ExportContratoJson = {
  version: typeof RESPALDO_AIAC_VERSION;
  tipo: "contrato";
  exportado_en: string;
  contrato: string;
  objeto_contractual: string;
  obligaciones: string;
};

export type RespaldoAiacImportable =
  | RespaldoAiacCompleto
  | ExportConfiguracionIAJson;

export type RespaldoAiacDatos = {
  respaldo: RespaldoAiacCompleto;
  exportConfiguracion: ExportConfiguracionIAJson;
  exportContrato: ExportContratoJson;
};

export type RestaurarRespaldoResult =
  | { success: true }
  | { success: false; error: string };
