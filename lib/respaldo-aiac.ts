import type {
  ExportConfiguracionIAJson,
  ExportContratoJson,
  RespaldoAiacCompleto,
  RespaldoAiacDatos,
  RespaldoAiacImportable,
  RespaldoConfiguracionIAPayload,
  RespaldoContratoPayload,
} from "@/types/respaldo-aiac";
import type { ConfiguracionIA } from "@/types/configuracion-ia";
import type { Contrato } from "@/types/contrato";

const NOMBRES_RESERVADOS_WINDOWS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "lpt1",
  "lpt2",
  "lpt3",
]);

function sanitizarSegmentoArchivo(
  texto: string,
  fallback: string,
  maxLength = 60
): string {
  let normalizado = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLength);

  if (!normalizado || NOMBRES_RESERVADOS_WINDOWS.has(normalizado.toLowerCase())) {
    normalizado = fallback;
  }

  return normalizado;
}

export function sanitizarNombreArchivoRespaldo(nombreArchivo: string): string {
  const extension = ".json";
  const base = nombreArchivo.toLowerCase().endsWith(extension)
    ? nombreArchivo.slice(0, -extension.length)
    : nombreArchivo;

  const sanitizado = base
    .split("_")
    .map((segmento) => sanitizarSegmentoArchivo(segmento, "AIAC"))
    .filter(Boolean)
    .join("_");

  return `${sanitizarSegmentoArchivo(sanitizado || "AIAC_Respaldo", "AIAC_Respaldo")}.json`;
}

function fechaExportacionIso(): string {
  return new Date().toISOString();
}

function fechaExportacionArchivo(): string {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function contratoDesdeRegistro(contrato: Contrato | null): RespaldoContratoPayload {
  return {
    nombre: contrato?.nombre ?? "",
    entidad: contrato?.entidad ?? "",
    objeto_contractual: contrato?.objeto_contractual ?? "",
    obligaciones: contrato?.obligaciones ?? "",
  };
}

function configuracionDesdeRegistro(
  configuracion: ConfiguracionIA | null
): RespaldoConfiguracionIAPayload {
  return {
    instrucciones_informe: configuracion?.instrucciones_informe ?? "",
    estilo_redaccion: configuracion?.estilo_redaccion ?? "",
    ejemplos_redaccion: configuracion?.ejemplos_redaccion ?? "",
    contexto_tecnico: configuracion?.contexto_tecnico ?? "",
  };
}

export function construirRespaldoAiac(
  contrato: Contrato | null,
  configuracion: ConfiguracionIA | null
): RespaldoAiacDatos {
  const contratoPayload = contratoDesdeRegistro(contrato);
  const configuracionPayload = configuracionDesdeRegistro(configuracion);
  const exportadoEn = fechaExportacionIso();

  const respaldo: RespaldoAiacCompleto = {
    version: 1,
    tipo: "respaldo_aiac",
    exportado_en: exportadoEn,
    contrato: contratoPayload,
    configuracion_ia: configuracionPayload,
  };

  const exportConfiguracion: ExportConfiguracionIAJson = {
    version: 1,
    tipo: "configuracion_ia",
    exportado_en: exportadoEn,
    contrato: contratoPayload.nombre,
    objeto_contractual: contratoPayload.objeto_contractual,
    obligaciones: contratoPayload.obligaciones,
    instrucciones_informe: configuracionPayload.instrucciones_informe,
    ejemplos_redaccion: configuracionPayload.ejemplos_redaccion,
    contexto_tecnico: configuracionPayload.contexto_tecnico,
  };

  const exportContrato: ExportContratoJson = {
    version: 1,
    tipo: "contrato",
    exportado_en: exportadoEn,
    contrato: contratoPayload.nombre,
    objeto_contractual: contratoPayload.objeto_contractual,
    obligaciones: contratoPayload.obligaciones,
  };

  return {
    respaldo,
    exportConfiguracion,
    exportContrato,
  };
}

export function construirNombreArchivoRespaldoCompleto(contratoNombre: string): string {
  const contrato = sanitizarSegmentoArchivo(contratoNombre, "Contrato");
  return sanitizarNombreArchivoRespaldo(`AIAC_Respaldo_${contrato}_${fechaExportacionArchivo()}.json`);
}

export function construirNombreArchivoExportConfiguracion(contratoNombre: string): string {
  const contrato = sanitizarSegmentoArchivo(contratoNombre, "Contrato");
  return sanitizarNombreArchivoRespaldo(
    `AIAC_ConfiguracionIA_${contrato}_${fechaExportacionArchivo()}.json`
  );
}

export function construirNombreArchivoExportContrato(contratoNombre: string): string {
  const contrato = sanitizarSegmentoArchivo(contratoNombre, "Contrato");
  return sanitizarNombreArchivoRespaldo(
    `AIAC_Contrato_${contrato}_${fechaExportacionArchivo()}.json`
  );
}

function leerCampoString(
  record: Record<string, unknown>,
  campo: string,
  requerido = true
): string | null {
  if (!(campo in record)) {
    return requerido ? null : "";
  }

  const valor = record[campo];

  if (typeof valor !== "string") {
    return null;
  }

  return valor;
}

function validarVersion(record: Record<string, unknown>): boolean {
  return record.version === 1;
}

function validarRespaldoCompleto(record: Record<string, unknown>): RespaldoAiacCompleto | null {
  if (record.tipo !== "respaldo_aiac" || !validarVersion(record)) {
    return null;
  }

  const contratoRecord = record.contrato;

  if (!contratoRecord || typeof contratoRecord !== "object") {
    return null;
  }

  const configuracionRecord = record.configuracion_ia;

  if (!configuracionRecord || typeof configuracionRecord !== "object") {
    return null;
  }

  const contratoObj = contratoRecord as Record<string, unknown>;
  const configuracionObj = configuracionRecord as Record<string, unknown>;

  const nombre = leerCampoString(contratoObj, "nombre");
  const entidad = leerCampoString(contratoObj, "entidad");
  const objetoContractual = leerCampoString(contratoObj, "objeto_contractual");
  const obligaciones = leerCampoString(contratoObj, "obligaciones");

  const instruccionesInforme = leerCampoString(configuracionObj, "instrucciones_informe");
  const estiloRedaccion = leerCampoString(configuracionObj, "estilo_redaccion");
  const ejemplosRedaccion = leerCampoString(configuracionObj, "ejemplos_redaccion");
  const contextoTecnico = leerCampoString(configuracionObj, "contexto_tecnico");

  if (
    nombre === null ||
    entidad === null ||
    objetoContractual === null ||
    obligaciones === null ||
    instruccionesInforme === null ||
    estiloRedaccion === null ||
    ejemplosRedaccion === null ||
    contextoTecnico === null
  ) {
    return null;
  }

  const exportadoEn = leerCampoString(record, "exportado_en", false) ?? fechaExportacionIso();

  return {
    version: 1,
    tipo: "respaldo_aiac",
    exportado_en: exportadoEn,
    contrato: {
      nombre,
      entidad,
      objeto_contractual: objetoContractual,
      obligaciones,
    },
    configuracion_ia: {
      instrucciones_informe: instruccionesInforme,
      estilo_redaccion: estiloRedaccion,
      ejemplos_redaccion: ejemplosRedaccion,
      contexto_tecnico: contextoTecnico,
    },
  };
}

function validarExportConfiguracion(
  record: Record<string, unknown>
): ExportConfiguracionIAJson | null {
  if (record.tipo !== "configuracion_ia" || !validarVersion(record)) {
    return null;
  }

  const contrato = leerCampoString(record, "contrato");
  const objetoContractual = leerCampoString(record, "objeto_contractual");
  const obligaciones = leerCampoString(record, "obligaciones");
  const instruccionesInforme = leerCampoString(record, "instrucciones_informe");
  const ejemplosRedaccion = leerCampoString(record, "ejemplos_redaccion");
  const contextoTecnico = leerCampoString(record, "contexto_tecnico");

  if (
    contrato === null ||
    objetoContractual === null ||
    obligaciones === null ||
    instruccionesInforme === null ||
    ejemplosRedaccion === null ||
    contextoTecnico === null
  ) {
    return null;
  }

  const exportadoEn = leerCampoString(record, "exportado_en", false) ?? fechaExportacionIso();

  return {
    version: 1,
    tipo: "configuracion_ia",
    exportado_en: exportadoEn,
    contrato,
    objeto_contractual: objetoContractual,
    obligaciones,
    instrucciones_informe: instruccionesInforme,
    ejemplos_redaccion: ejemplosRedaccion,
    contexto_tecnico: contextoTecnico,
  };
}

export function parsearRespaldoImportable(data: unknown): RespaldoAiacImportable | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  return validarRespaldoCompleto(record) ?? validarExportConfiguracion(record);
}

export function respaldoImportableAFilas(
  respaldo: RespaldoAiacImportable,
  entidadActual: string,
  estiloRedaccionActual: string
): {
  contrato: RespaldoContratoPayload;
  configuracion: RespaldoConfiguracionIAPayload;
} {
  if (respaldo.tipo === "respaldo_aiac") {
    return {
      contrato: respaldo.contrato,
      configuracion: respaldo.configuracion_ia,
    };
  }

  return {
    contrato: {
      nombre: respaldo.contrato,
      entidad: entidadActual,
      objeto_contractual: respaldo.objeto_contractual,
      obligaciones: respaldo.obligaciones,
    },
    configuracion: {
      instrucciones_informe: respaldo.instrucciones_informe,
      estilo_redaccion: estiloRedaccionActual,
      ejemplos_redaccion: respaldo.ejemplos_redaccion,
      contexto_tecnico: respaldo.contexto_tecnico,
    },
  };
}

export function descargarJsonEnNavegador(data: unknown, nombreArchivo: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = sanitizarNombreArchivoRespaldo(nombreArchivo);
  enlace.click();

  URL.revokeObjectURL(url);
}
