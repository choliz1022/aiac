const TERMINOS_ECOSISTEMA_EXCLUIDOS = new Set([
  "sirci",
  "sigmp",
  "its",
  "tic",
  "ecosistema",
  "ecosistemas",
  "plataforma",
  "plataformas",
  "bus-estacion",
  "bus estacion",
]);

const STOP_WORDS = new Set([
  "para",
  "como",
  "con",
  "del",
  "de",
  "la",
  "las",
  "el",
  "los",
  "una",
  "uno",
  "sus",
  "por",
  "en",
  "y",
  "o",
  "a",
  "al",
  "que",
  "se",
  "su",
  "sus",
  "este",
  "esta",
  "estos",
  "estas",
  "direccion",
  "dirección",
  "apoyo",
  "apoyar",
  "realizar",
  "realizo",
  "realizacion",
  "realización",
  "actividades",
  "actividad",
  "contrato",
  "contractual",
  "contractuales",
  "servicios",
  "servicio",
  "tecnico",
  "técnico",
  "tecnicos",
  "técnicos",
]);

const PATRONES_OBLIGACION_BASURA = [
  /^prueba(\s*\d+)?$/i,
  /^test(\s*\d+)?$/i,
  /^temporal(\s*\d+)?$/i,
  /^sin obligaci[oó]n detectada$/i,
];

const VERBOS_ACTIVIDAD = [
  "revision",
  "revisión",
  "revisar",
  "ajuste",
  "ajustes",
  "ajustar",
  "elaboracion",
  "elaboración",
  "elaborar",
  "estructuracion",
  "estructuración",
  "estructurar",
  "formulacion",
  "formulación",
  "formular",
  "planificacion",
  "planificación",
  "planificar",
  "coordinacion",
  "coordinación",
  "coordinar",
  "monitorizacion",
  "monitorización",
  "monitorizar",
  "seguimiento",
  "seguir",
  "evaluacion",
  "evaluación",
  "evaluar",
  "observacion",
  "observación",
  "observaciones",
  "informe",
  "informes",
  "visita",
  "visitas",
  "prueba",
  "pruebas",
  "probar",
  "interventoria",
  "interventoría",
  "analisis",
  "análisis",
  "analizar",
  "proyeccion",
  "proyección",
  "proyectar",
  "articulacion",
  "articulación",
  "articular",
  "validacion",
  "validación",
  "validar",
  "actualizacion",
  "actualización",
  "actualizar",
  "socializacion",
  "socialización",
  "socializar",
];

const PATRONES_DOCUMENTO_ENTREGABLE = [
  /\banexo(?:\s+t[eé]cnico)?(?:\s+its)?(?:\s+principal)?\b/gi,
  /\bestudio(?:s)? de mercado\b/gi,
  /\brequerimiento(?:s)? t[eé]cnic[oa]s?\b/gi,
  /\binforme(?:s)?(?:\s+[a-z0-9áéíóúüñ.-]{2,40})?\b/gi,
  /\bacta(?:s)?(?:\s+[a-z0-9áéíóúüñ.-]{2,40})?\b/gi,
  /\bentregable(?:s)?\b/gi,
  /\botros[ií]\s*\d+\b/gi,
  /\bobservaciones(?:\s+t[eé]cnicas)?\b/gi,
  /\bplan(?:es)? de prueba(?:s)?\b/gi,
  /\bmatriz(?:es)?\b/gi,
  /\bprotocolo(?:s)?\b/gi,
];

export type ObligacionContratoIndex = {
  nombre: string;
  fragmentoInicial: string;
  palabrasClave: string[];
};

export type SeñalesActividadContractual = {
  verbos: string[];
  documentos: string[];
  tipo_actividad_detectada: string;
};

export type ResultadoClasificacionObligacion = {
  obligacion_detectada: string;
  tipo_actividad_detectada: string;
  puntaje: number;
  verbosCoincidentes: number;
  documentosCoincidentes: number;
  origen: "exacta" | "mecanica";
};

export function normalizarTextoObligacion(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function esObligacionBasura(nombre: string): boolean {
  const normalizado = normalizarTextoObligacion(nombre);

  if (!normalizado) {
    return true;
  }

  return PATRONES_OBLIGACION_BASURA.some((patron) => patron.test(normalizado));
}

function limpiarLineaObligacion(linea: string): string {
  return linea
    .replace(/^\s*[\d]+[\.\)]\s*/, "")
    .replace(/^\s*[-•*]\s*/, "")
    .trim();
}

export function parseObligacionesContrato(texto: string): string[] {
  const obligaciones: string[] = [];
  const vistas = new Set<string>();

  for (const linea of texto.split(/\n+/)) {
    const nombre = limpiarLineaObligacion(linea);

    if (!nombre || esObligacionBasura(nombre)) {
      continue;
    }

    const clave = normalizarTextoObligacion(nombre);

    if (vistas.has(clave)) {
      continue;
    }

    vistas.add(clave);
    obligaciones.push(nombre);
  }

  return obligaciones;
}

function esTerminoExcluidoClasificacion(texto: string): boolean {
  const normalizado = normalizarTextoObligacion(texto);

  if (!normalizado) {
    return true;
  }

  if (TERMINOS_ECOSISTEMA_EXCLUIDOS.has(normalizado)) {
    return true;
  }

  return [...TERMINOS_ECOSISTEMA_EXCLUIDOS].some(
    (termino) =>
      normalizado === termino ||
      normalizado.startsWith(`${termino} `) ||
      normalizado.endsWith(` ${termino}`) ||
      normalizado.includes(` ${termino} `)
  );
}

function tokenizarTextoRelevante(texto: string): string[] {
  return normalizarTextoObligacion(texto)
    .split(/[^a-z0-9áéíóúüñ-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .filter((token) => !STOP_WORDS.has(normalizarTextoObligacion(token)))
    .filter((token) => !esTerminoExcluidoClasificacion(token));
}

function extraerFragmentoInicialObligacion(nombre: string): string {
  const segmento = nombre.split(/[.;]/)[0]?.trim() ?? nombre.trim();
  return segmento.length > 140 ? `${segmento.slice(0, 137)}...` : segmento;
}

function construirPalabrasClaveObligacion(nombre: string): string[] {
  const fragmentoInicial = extraerFragmentoInicialObligacion(nombre);
  const tokens = new Set<string>([
    ...tokenizarTextoRelevante(fragmentoInicial),
    ...tokenizarTextoRelevante(nombre),
  ]);

  for (const verbo of VERBOS_ACTIVIDAD) {
    const verboNormalizado = normalizarTextoObligacion(verbo);

    if (normalizarTextoObligacion(nombre).includes(verboNormalizado)) {
      tokens.add(verboNormalizado);
    }
  }

  return [...tokens];
}

export function indexarObligacionesContrato(texto: string): ObligacionContratoIndex[] {
  return parseObligacionesContrato(texto).map((nombre) => ({
    nombre,
    fragmentoInicial: extraerFragmentoInicialObligacion(nombre),
    palabrasClave: construirPalabrasClaveObligacion(nombre),
  }));
}

export function extraerVerbosPrincipales(texto: string): string[] {
  const normalizado = normalizarTextoObligacion(texto);
  const verbos = new Set<string>();

  for (const verbo of VERBOS_ACTIVIDAD) {
    const verboNormalizado = normalizarTextoObligacion(verbo);

    if (
      normalizado.includes(` ${verboNormalizado} `) ||
      normalizado.startsWith(`${verboNormalizado} `) ||
      normalizado.endsWith(` ${verboNormalizado}`) ||
      normalizado === verboNormalizado
    ) {
      verbos.add(verboNormalizado);
    }
  }

  return [...verbos];
}

export function extraerDocumentosEntregables(texto: string): string[] {
  const documentos = new Set<string>();

  for (const patron of PATRONES_DOCUMENTO_ENTREGABLE) {
    const coincidencias = texto.match(patron);

    if (!coincidencias) {
      continue;
    }

    for (const coincidencia of coincidencias) {
      documentos.add(normalizarTextoObligacion(coincidencia));
    }

    patron.lastIndex = 0;
  }

  return [...documentos];
}

export function inferirTipoActividadDetectada(
  verbos: string[],
  documentos: string[]
): string {
  const verboPrincipal = verbos[0] ?? "actividad contractual";
  const documentoPrincipal = documentos[0];

  if (documentoPrincipal) {
    return `${verboPrincipal} de ${documentoPrincipal}`;
  }

  return verboPrincipal;
}

export function extraerSeñalesActividadContractual(
  actividadOriginal: string,
  tipoActividadSugerida?: string | null
): SeñalesActividadContractual {
  const verbos = extraerVerbosPrincipales(actividadOriginal);
  const documentos = extraerDocumentosEntregables(actividadOriginal);
  const tipo_actividad_detectada =
    tipoActividadSugerida?.trim() ||
    inferirTipoActividadDetectada(verbos, documentos);

  return {
    verbos,
    documentos,
    tipo_actividad_detectada,
  };
}

function contarCoincidenciasParciales(
  terminos: string[],
  palabrasClave: Set<string>
): number {
  let coincidencias = 0;

  for (const termino of terminos) {
    if (palabrasClave.has(termino)) {
      coincidencias += 1;
      continue;
    }

    for (const clave of palabrasClave) {
      if (clave.includes(termino) || termino.includes(clave)) {
        coincidencias += 1;
        break;
      }
    }
  }

  return coincidencias;
}

function calcularPuntajeObligacionContractual(
  señales: SeñalesActividadContractual,
  obligacion: ObligacionContratoIndex
): {
  puntaje: number;
  verbosCoincidentes: number;
  documentosCoincidentes: number;
  especificidad: number;
} {
  const palabrasClave = new Set(obligacion.palabrasClave);
  const verbosCoincidentes = contarCoincidenciasParciales(señales.verbos, palabrasClave);
  const documentosCoincidentes = contarCoincidenciasParciales(señales.documentos, palabrasClave);
  const tipoNormalizado = normalizarTextoObligacion(señales.tipo_actividad_detectada);
  const tipoCoincide = [...palabrasClave].some(
    (clave) => tipoNormalizado.includes(clave) || clave.includes(tipoNormalizado)
  );

  if (verbosCoincidentes === 0 && documentosCoincidentes === 0 && !tipoCoincide) {
    return {
      puntaje: 0,
      verbosCoincidentes,
      documentosCoincidentes,
      especificidad: 0,
    };
  }

  const puntajeVerbos = verbosCoincidentes > 0 ? 30 + verbosCoincidentes * 20 : 0;
  const puntajeDocumentos = documentosCoincidentes > 0 ? 30 + documentosCoincidentes * 25 : 0;
  const puntajeTipo = tipoCoincide ? 15 : 0;
  const especificidad = verbosCoincidentes + documentosCoincidentes + (tipoCoincide ? 1 : 0);

  return {
    puntaje: Math.min(100, puntajeVerbos + puntajeDocumentos + puntajeTipo),
    verbosCoincidentes,
    documentosCoincidentes,
    especificidad,
  };
}

function compararClasificacionesObligacion(
  a: ResultadoClasificacionObligacion & { especificidad: number },
  b: ResultadoClasificacionObligacion & { especificidad: number }
): number {
  if (b.puntaje !== a.puntaje) {
    return b.puntaje - a.puntaje;
  }

  if (b.verbosCoincidentes !== a.verbosCoincidentes) {
    return b.verbosCoincidentes - a.verbosCoincidentes;
  }

  if (b.documentosCoincidentes !== a.documentosCoincidentes) {
    return b.documentosCoincidentes - a.documentosCoincidentes;
  }

  return b.especificidad - a.especificidad;
}

export function resolverObligacionExactaContrato(
  obligacionDetectada: string,
  obligacionesContrato: string[]
): string | null {
  const normalizada = normalizarTextoObligacion(obligacionDetectada);

  if (!normalizada || esObligacionBasura(obligacionDetectada)) {
    return null;
  }

  for (const obligacion of obligacionesContrato) {
    if (normalizarTextoObligacion(obligacion) === normalizada) {
      return obligacion;
    }
  }

  return null;
}

export function clasificarObligacionDesdeActividad({
  actividadOriginal,
  obligacionesTexto,
  obligacionSugeridaIa,
  tipoActividadSugeridaIa,
}: {
  actividadOriginal: string;
  obligacionesTexto: string;
  obligacionSugeridaIa?: string | null;
  tipoActividadSugeridaIa?: string | null;
}): ResultadoClasificacionObligacion | null {
  const obligacionesContrato = parseObligacionesContrato(obligacionesTexto);

  if (obligacionesContrato.length === 0) {
    return null;
  }

  if (obligacionSugeridaIa) {
    const exacta = resolverObligacionExactaContrato(obligacionSugeridaIa, obligacionesContrato);

    if (exacta) {
      const señales = extraerSeñalesActividadContractual(
        actividadOriginal,
        tipoActividadSugeridaIa
      );

      return {
        obligacion_detectada: exacta,
        tipo_actividad_detectada: señales.tipo_actividad_detectada,
        puntaje: 100,
        verbosCoincidentes: señales.verbos.length,
        documentosCoincidentes: señales.documentos.length,
        origen: "exacta",
      };
    }
  }

  const indice = indexarObligacionesContrato(obligacionesTexto);
  const señales = extraerSeñalesActividadContractual(
    actividadOriginal,
    tipoActividadSugeridaIa
  );

  const candidatos = indice
    .map((obligacion) => {
      const resultado = calcularPuntajeObligacionContractual(señales, obligacion);

      return {
        obligacion_detectada: obligacion.nombre,
        tipo_actividad_detectada: señales.tipo_actividad_detectada,
        puntaje: resultado.puntaje,
        verbosCoincidentes: resultado.verbosCoincidentes,
        documentosCoincidentes: resultado.documentosCoincidentes,
        especificidad: resultado.especificidad,
        origen: "mecanica" as const,
      };
    })
    .filter((candidato) => candidato.puntaje >= 30)
    .sort(compararClasificacionesObligacion);

  return candidatos[0] ?? null;
}

export function validarObligacionDetectada({
  actividadOriginal,
  obligacionesTexto,
  obligacionDetectadaIa,
  tipoActividadDetectadaIa,
}: {
  actividadOriginal: string;
  obligacionesTexto: string;
  obligacionDetectadaIa: string;
  tipoActividadDetectadaIa?: string | null;
}): ResultadoClasificacionObligacion {
  const clasificacion = clasificarObligacionDesdeActividad({
    actividadOriginal,
    obligacionesTexto,
    obligacionSugeridaIa: obligacionDetectadaIa,
    tipoActividadSugeridaIa: tipoActividadDetectadaIa,
  });

  if (clasificacion) {
    if (clasificacion.origen === "mecanica") {
      console.warn(
        `[Clasificación contractual] Obligación IA "${obligacionDetectadaIa}" ajustada mecánicamente a "${clasificacion.obligacion_detectada}".`
      );
    }

    return clasificacion;
  }

  const obligacionesContrato = parseObligacionesContrato(obligacionesTexto);

  throw new Error(
    `No se pudo clasificar la actividad en una obligación contractual válida. Obligaciones disponibles: ${obligacionesContrato.length}.`
  );
}

export function buildCatalogoObligacionesParaPrompt(obligacionesTexto: string): string {
  const indice = indexarObligacionesContrato(obligacionesTexto);

  if (indice.length === 0) {
    return "No hay obligaciones contractuales configuradas.";
  }

  return indice
    .map((obligacion, index) => {
      const palabrasClave =
        obligacion.palabrasClave.length > 0
          ? obligacion.palabrasClave.slice(0, 12).join(", ")
          : obligacion.fragmentoInicial;

      return `[${index + 1}] "${obligacion.nombre}"
Palabras clave: ${palabrasClave}`;
    })
    .join("\n\n");
}

export function calcularPuntajeClasificacionAlmacenada({
  actividadOriginal,
  obligacionDetectada,
  obligacionesTexto,
  tipoActividadDetectada,
}: {
  actividadOriginal: string;
  obligacionDetectada: string;
  obligacionesTexto: string;
  tipoActividadDetectada?: string | null;
}): number {
  const obligacionesContrato = parseObligacionesContrato(obligacionesTexto);
  const obligacionExacta = resolverObligacionExactaContrato(
    obligacionDetectada,
    obligacionesContrato
  );

  if (!obligacionExacta) {
    return 0;
  }

  const obligacionIndexada = indexarObligacionesContrato(obligacionesTexto).find(
    (obligacion) => obligacion.nombre === obligacionExacta
  );

  if (!obligacionIndexada) {
    return 0;
  }

  const señales = extraerSeñalesActividadContractual(
    actividadOriginal,
    tipoActividadDetectada
  );

  return calcularPuntajeObligacionContractual(señales, obligacionIndexada).puntaje;
}

export function resolverObligacionActividadAlmacenada(
  actividadOriginal: string,
  obligacionDetectada: string,
  obligacionesContrato: string[],
  options: {
    tipoActividadDetectada?: string | null;
    clasificacionManual?: boolean;
  } = {}
): string | null {
  const { tipoActividadDetectada, clasificacionManual = false } = options;

  if (clasificacionManual) {
    return resolverObligacionExactaContrato(obligacionDetectada, obligacionesContrato);
  }

  const exacta = resolverObligacionExactaContrato(obligacionDetectada, obligacionesContrato);

  if (exacta) {
    return exacta;
  }

  const reclasificacion = clasificarObligacionDesdeActividad({
    actividadOriginal,
    obligacionesTexto: obligacionesContrato.join("\n"),
    obligacionSugeridaIa: obligacionDetectada,
    tipoActividadSugeridaIa: tipoActividadDetectada,
  });

  return reclasificacion?.obligacion_detectada ?? null;
}
