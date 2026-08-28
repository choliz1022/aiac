import type { DefinicionFrenteContexto } from "@/lib/parsear-frentes-contexto-tecnico";

const LONGITUD_MINIMA_RESULTADO = 4;

/** Prefijos de acción (más largos primero) para aislar el objeto de trabajo. */
const PREFIJOS_ACCION = [
  "visita de inspeccion de",
  "visita de inspeccion",
  "validacion del estado de",
  "validacion de estado de",
  "validacion del estado",
  "validacion de",
  "validacion estado",
  "validacion",
  "inspeccion de la",
  "inspeccion de",
  "inspeccion",
  "visita tecnica de",
  "visita tecnica",
  "revision de la",
  "revision de",
  "revision",
  "elaboracion de",
  "elaboracion",
  "estructuracion de",
  "estructuracion",
  "ajuste de los",
  "ajuste de las",
  "ajuste de",
  "ajuste",
  "coordinacion de",
  "coordinacion",
  "seguimiento de",
  "seguimiento",
  "pruebas de",
  "pruebas",
  "evaluacion de",
  "evaluacion",
  "apoyo en",
  "apoyo a",
  "apoyo",
];

export type OpcionesResultadoTrabajo = {
  frentesContexto?: DefinicionFrenteContexto[];
};

function normalizarTextoPlano(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizarResultadoId(texto: string): string {
  const id = normalizarTextoPlano(texto)
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return id.length >= LONGITUD_MINIMA_RESULTADO ? id : "";
}

function quitarFrentesConocidos(texto: string, frentesContexto: DefinicionFrenteContexto[]): string {
  let resultado = texto;

  for (const frente of frentesContexto) {
    const nombres = [frente.etiqueta, frente.id.replace(/-/g, " ")];

    for (const nombre of nombres) {
      const normalizado = normalizarTextoPlano(nombre);
      if (!normalizado) continue;

      const patron = new RegExp(`\\ben\\s+${normalizado.replace(/\s+/g, "\\s+")}\\b`, "gi");
      resultado = resultado.replace(patron, " ");
    }
  }

  return resultado.replace(/\ben\s+[a-z0-9-]+\b/gi, " ").replace(/\s+/g, " ").trim();
}

function quitarPrefijoAccion(texto: string): string {
  let resto = normalizarTextoPlano(texto);
  let cambio = true;

  while (cambio) {
    cambio = false;

    for (const prefijo of PREFIJOS_ACCION) {
      if (resto.startsWith(`${prefijo} `)) {
        resto = resto.slice(prefijo.length + 1).trim();
        cambio = true;
        break;
      }

      if (resto === prefijo) {
        return "";
      }
    }
  }

  return resto;
}

function quitarCalificadoresEstado(texto: string): string {
  return texto
    .replace(/^estado de\s+/i, "")
    .replace(/^estado\s+/i, "")
    .trim();
}

/** Alinea variantes telegráficas del mismo objeto (p. ej. equipamiento SIRCI → instalación equipamiento SIRCI). */
function expandirEquivalenciasResultado(texto: string): string {
  const normalizado = normalizarTextoPlano(texto);

  if (/^equipamiento\b/.test(normalizado) && !/^instalacion\b/.test(normalizado)) {
    return `instalacion ${normalizado}`;
  }

  return normalizado;
}

/**
 * Extrae el resultado de trabajo (objeto principal) desde actividad_original.
 * Representa sobre qué se actuó, sin verbo ni frente.
 */
export function extraerResultadoTrabajo(
  actividadOriginal: string,
  opciones?: OpcionesResultadoTrabajo
): string | null {
  const original = actividadOriginal.trim();

  if (!original) {
    return null;
  }

  const frentesContexto = opciones?.frentesContexto ?? [];
  let nucleo = quitarFrentesConocidos(original, frentesContexto);
  nucleo = quitarPrefijoAccion(nucleo);
  nucleo = quitarCalificadoresEstado(nucleo);
  nucleo = expandirEquivalenciasResultado(nucleo);

  const id = normalizarResultadoId(nucleo);

  return id || null;
}
