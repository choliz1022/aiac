const SIGLAS_PROTEGIDAS = ["SIRCI", "ZMO", "ETIB", "FET", "BCA-PAT", "SIGMP"] as const;

const FORMULARIOS_DESARROLLADOS: Record<string, RegExp[]> = {
  SIRCI: [
    /sistema\s+inteligente\s+de\s+control\s+de\s+flota/i,
    /sistema\s+inteligente\s+de\s+transporte/i,
  ],
  SIGMP: [/sistema\s+inteligente\s+de\s+gesti[oó]n\s+y\s+monitorizaci[oó]n\s+puertas/i],
  "BCA-PAT": [/barreras?\s+de\s+control\s+de\s+acceso\s+de\s+piso\s+a\s+techo/i],
};

const PATRONES_PERMITIR_EXPANSION = [
  /permitir\s+expandir\s+(?:la\s+sigla\s+)?([a-z0-9-]+)/gi,
  /expandir\s+(?:la\s+sigla\s+)?([a-z0-9-]+)\s+en\s+redacci[oó]n/gi,
  /s[ií]\s+expandir\s+(?:la\s+sigla\s+)?([a-z0-9-]+)/gi,
] as const;

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizarSigla(texto: string): string {
  return texto.trim().toUpperCase();
}

function mencionaSigla(texto: string, sigla: string): boolean {
  const normalizada = texto.toLowerCase();
  const siglaNormalizada = sigla.toLowerCase();

  return (
    new RegExp(`\\b${escaparRegex(siglaNormalizada)}\\b`, "i").test(normalizada) ||
    normalizada.replace(/[^a-z0-9]/g, "").includes(siglaNormalizada.replace(/[^a-z0-9]/g, ""))
  );
}

export function parsearSiglasPermitidasExpandir(textoReglas: string): Set<string> {
  const siglas = new Set<string>();

  for (const patron of PATRONES_PERMITIR_EXPANSION) {
    patron.lastIndex = 0;

    for (const coincidencia of textoReglas.matchAll(patron)) {
      const sigla = normalizarSigla(coincidencia[1] ?? "");

      if (sigla) {
        siglas.add(sigla);
      }
    }
  }

  return siglas;
}

function siglaDesarrolladaEnOriginal(actividadOriginal: string, sigla: string): boolean {
  const original = actividadOriginal.trim();

  if (!original || !mencionaSigla(original, sigla)) {
    return false;
  }

  const siglaEscapada = escaparRegex(sigla);
  const conParentesis = new RegExp(`[\\w\\sÁÉÍÓÚáéíóúñÑ-]{8,}\\(\\s*${siglaEscapada}\\s*\\)`, "i");

  if (conParentesis.test(original)) {
    return true;
  }

  const formularios = FORMULARIOS_DESARROLLADOS[sigla] ?? [];

  return formularios.some((patron) => patron.test(original));
}

function colapsarExpansionSigla(texto: string, sigla: string): string {
  const siglaEscapada = escaparRegex(sigla);
  let resultado = texto;

  resultado = resultado.replace(
    new RegExp(`[\\w\\sÁÉÍÓÚáéíóúñÑ-]{8,}\\(\\s*${siglaEscapada}\\s*\\)`, "gi"),
    sigla
  );

  const formularios = FORMULARIOS_DESARROLLADOS[sigla] ?? [];

  for (const patron of formularios) {
    patron.lastIndex = 0;
    resultado = resultado.replace(patron, sigla);
  }

  return resultado.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}

/**
 * Colapsa expansiones de siglas (nombre completo → sigla). No modifica el desarrollo de acciones.
 * Regla: no expandir siglas salvo que estén desarrolladas en actividad_original
 * o el usuario lo permita explícitamente en Configuración IA.
 */
export function aplicarReglasNoExpandirRedaccion({
  redaccion_ia,
  resumen_ia,
  actividadOriginal,
  textoReglas,
}: {
  redaccion_ia: string;
  resumen_ia: string;
  actividadOriginal: string;
  textoReglas: string;
}): { redaccion_ia: string; resumen_ia: string } {
  const siglasPermitidas = parsearSiglasPermitidasExpandir(textoReglas);
  let redaccion = redaccion_ia;
  let resumen = resumen_ia;

  for (const sigla of SIGLAS_PROTEGIDAS) {
    if (siglasPermitidas.has(sigla)) {
      continue;
    }

    if (siglaDesarrolladaEnOriginal(actividadOriginal, sigla)) {
      continue;
    }

    if (!mencionaSigla(actividadOriginal, sigla) && !mencionaSigla(redaccion, sigla)) {
      continue;
    }

    redaccion = colapsarExpansionSigla(redaccion, sigla);
    resumen = colapsarExpansionSigla(resumen, sigla);
  }

  return { redaccion_ia: redaccion, resumen_ia: resumen };
}
