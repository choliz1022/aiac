import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import {
  AGRUPAR_INFORME_SYSTEM_PROMPT,
  buildAgruparObligacionUserPrompt,
} from "@/lib/prompts/consolidar-informe";
import {
  buildSintetizarConsolidacionUserPrompt,
  SINTETIZAR_CONSOLIDACION_SYSTEM_PROMPT,
} from "@/lib/prompts/sintetizar-consolidacion";
import type { Actividad } from "@/types/actividad";
import type {
  ConsolidacionInformeResult,
  InformeMensualActividadConsolidada,
  InformeMensualContrato,
  InformeMensualEvidencia,
} from "@/types/informe-mensual";
import { recolectarEvidenciasDeActividades } from "@/lib/evidencias";
import type { EvidenciasPorActividad } from "@/types/actividad-evidencia";

const ECOSISTEMA_INSUFICIENTE = new Set([
  "sirci",
  "sigmp",
  "its",
  "tic",
  "plataforma",
  "ecosistema",
  "ecosistema tecnologico",
  "plataforma tecnologica",
  "direccion de tic",
  "contrato",
  "obligacion",
  "marco del sigmp",
  "marco del sirci",
]);

const TERMINOS_ECOSISTEMA = ["sirci", "sigmp", "its"];

const PREFIJOS_ANCLA_CONSOLIDACION = [
  "documento",
  "entregable",
  "proceso",
  "proyecto",
] as const;

type EcosistemaId = "sirci" | "sigmp" | "bus-estacion";

type DefinicionFrenteTrabajo = {
  id: string;
  etiqueta: string;
  ecosistema: EcosistemaId;
  patrones: RegExp[];
};

const DEFINICIONES_FRENTE_TRABAJO: DefinicionFrenteTrabajo[] = [
  {
    id: "otrosi-16",
    etiqueta: "Otrosí 16",
    ecosistema: "sirci",
    patrones: [/\botros[ií]\s*16\b/gi],
  },
  {
    id: "otrosi-20",
    etiqueta: "Otrosí 20",
    ecosistema: "sirci",
    patrones: [/\botros[ií]\s*20\b/gi],
  },
  {
    id: "otrosi-21",
    etiqueta: "Otrosí 21",
    ecosistema: "sirci",
    patrones: [/\botros[ií]\s*21\b/gi],
  },
  {
    id: "otrosi-22",
    etiqueta: "Otrosí 22",
    ecosistema: "sirci",
    patrones: [/\botros[ií]\s*22\b/gi],
  },
  {
    id: "otrosi-26",
    etiqueta: "Otrosí 26",
    ecosistema: "sirci",
    patrones: [/\botros[ií]\s*26\b/gi],
  },
  {
    id: "marcopolo",
    etiqueta: "MarcoPolo",
    ecosistema: "sirci",
    patrones: [/\bmarcopolo\b/gi],
  },
  {
    id: "medidores-compartidos",
    etiqueta: "Medidores compartidos",
    ecosistema: "sirci",
    patrones: [/\bmedidores compartidos\b/gi],
  },
  {
    id: "concesionario-sirci",
    etiqueta: "Concesionario SIRCI",
    ecosistema: "sirci",
    patrones: [/\bconcesionario sirci\b/gi],
  },
  {
    id: "interventoria-sirci",
    etiqueta: "Interventoría SIRCI",
    ecosistema: "sirci",
    patrones: [/\binterventor[ií]a sirci\b/gi],
  },
  {
    id: "its-puertas",
    etiqueta: "ITS de puertas",
    ecosistema: "sigmp",
    patrones: [/\bits de puertas\b/gi, /\bitc de puertas\b/gi],
  },
  {
    id: "interventoria-puertas",
    etiqueta: "Interventoría de puertas",
    ecosistema: "sigmp",
    patrones: [/\binterventor[ií]a de puertas\b/gi],
  },
  {
    id: "pruebas-puertas",
    etiqueta: "Pruebas de puertas",
    ecosistema: "sigmp",
    patrones: [/\bpruebas de puertas\b/gi],
  },
  {
    id: "puertas-automaticas",
    etiqueta: "Puertas automáticas",
    ecosistema: "sigmp",
    patrones: [/\bpuertas autom[aá]ticas\b/gi, /\bpuertas\b/gi],
  },
  {
    id: "audio-puertas",
    etiqueta: "Audio en puertas",
    ecosistema: "sigmp",
    patrones: [/\baudio en puertas\b/gi],
  },
  {
    id: "audio-estaciones",
    etiqueta: "Audio en estaciones",
    ecosistema: "sigmp",
    patrones: [/\baudio en estaciones\b/gi],
  },
  {
    id: "sensorica",
    etiqueta: "Sensorica",
    ecosistema: "sigmp",
    patrones: [/\bsensorica\b/gi, /\bsensor[ií]a\b/gi],
  },
  {
    id: "bca-pat",
    etiqueta: "BCA-PAT",
    ecosistema: "sirci",
    patrones: [/\bbca-?pat\b/gi],
  },
  {
    id: "audio-zonal",
    etiqueta: "Audio Zonal",
    ecosistema: "sirci",
    patrones: [/\baudio zonal\b/gi],
  },
  {
    id: "audio-interior",
    etiqueta: "Audio Interior",
    ecosistema: "sirci",
    patrones: [/\baudio interior\b/gi],
  },
  {
    id: "fms",
    etiqueta: "FMS",
    ecosistema: "sirci",
    patrones: [/\bfms\b/gi, /\bcontrol de flota\b/gi],
  },
  {
    id: "fet",
    etiqueta: "FET",
    ecosistema: "sirci",
    patrones: [/\bfet\b/gi, /fondo de estabilizaci[oó]n tarifaria/gi],
  },
  {
    id: "pip",
    etiqueta: "PIP",
    ecosistema: "sirci",
    patrones: [/\bpip\b/gi],
  },
  {
    id: "firmware",
    etiqueta: "Firmware",
    ecosistema: "sirci",
    patrones: [/\bfirmware\b/gi],
  },
  {
    id: "estudios-mercado",
    etiqueta: "Estudios de mercado",
    ecosistema: "sirci",
    patrones: [/\bestudios? de mercado\b/gi],
  },
  {
    id: "patio",
    etiqueta: "Patios",
    ecosistema: "sirci",
    patrones: [/\bpatio[s]?\b/gi],
  },
  {
    id: "flota",
    etiqueta: "Flota",
    ecosistema: "sirci",
    patrones: [/\bflota\b/gi, /\bbuses\b/gi],
  },
  {
    id: "pilotos",
    etiqueta: "Pilotos",
    ecosistema: "sigmp",
    patrones: [/\bpilotos\b/gi],
  },
  {
    id: "bus-estacion",
    etiqueta: "Bus-Estación",
    ecosistema: "bus-estacion",
    patrones: [/\bbus-?estaci[oó]n\b/gi],
  },
  {
    id: "rfid",
    etiqueta: "RFID",
    ecosistema: "bus-estacion",
    patrones: [/\brfid\b/gi],
  },
  {
    id: "indicadores-tic",
    etiqueta: "Indicadores TIC",
    ecosistema: "sirci",
    patrones: [/\bindicadores tic\b/gi],
  },
];

const PATRONES_DOCUMENTO_ESPECIFICO = [
  /estudio de mercado(?:\s+(?:para|de|del|la|las|el|los)\s+[^,.;]{2,80})?/gi,
  /anexo\s+[a-z0-9.-]+/gi,
  /informe\s+[a-z0-9áéíóúüñ.-]{2,40}/gi,
  /acta\s+[a-z0-9áéíóúüñ.-]{2,40}/gi,
];

const PATRONES_ENTREGABLE_ESPECIFICO = [
  /anexo(?:\s+t[eé]cnico)?(?:\s+its)?\s+[^,.;]{3,80}/gi,
  /entregable\s+[^,.;]{3,80}/gi,
];

const PATRONES_PROCESO_CONTRACTUAL = [
  /estructuraci[oó]n\s+otros[ií]\s*\d+/gi,
  /proceso\s+contractual\s+[^,.;]{3,60}/gi,
];

const PATRONES_PROCESO_POR_FRENTE: Record<string, RegExp[]> = {
  fet: [
    /\brevisi[oó]n(?:es)?\s+(?:del\s+|de\s+)?fet\b/gi,
    /\bajuste(?:s)?\s+(?:del\s+|de\s+)?fet\b/gi,
    /\bproyecci[oó]n(?:es)?\s+(?:econ[oó]mica(?:s)?\s+)?(?:del\s+|de\s+)?fet\b/gi,
    /\brecursos econ[oó]micos(?:\s+del\s+fet|\s+.*\bfet\b)/gi,
  ],
  "bca-pat": [
    /\bestudio(?:\s+de mercado)?\s+(?:para\s+)?(?:las\s+)?bca-?pat\b/gi,
    /\belaboraci[oó]n(?:\s+del|\s+de)?\s+estudio(?:\s+de mercado)?\s+(?:para\s+)?(?:las\s+)?bca-?pat\b/gi,
    /\bcontinuaci[oó]n(?:\s+del|\s+de)?\s+estudio(?:\s+de mercado)?\s+(?:para\s+)?(?:las\s+)?bca-?pat\b/gi,
  ],
  "audio-zonal": [
    /\bpruebas(?:\s+asociadas|\s+del|\s+de)?\s+.*\baudio zonal\b/gi,
    /\bmesa t[eé]cnica(?:\s+.*)?\baudio zonal\b/gi,
    /\bcoordinaci[oó]n(?:\s+.*)?\baudio zonal\b/gi,
  ],
};

const PATRONES_ECOSISTEMA_PROHIBIDOS = [
  /\ben el marco del sigmp\b/i,
  /\ben el marco del sirci\b/i,
  /\ben el marco del its\b/i,
  /\basociad[oa]\s+al sigmp\b/i,
  /\basociad[oa]\s+a la sirci\b/i,
  /\brelacionad[oa]\s+con sigmp\b/i,
  /\brelacionad[oa]\s+con sirci\b/i,
  /\brelacionad[oa]\s+con its\b/i,
  /\brelacionad[oa]\s+con sigmp y sirci\b/i,
  /\bdentro del ecosistema\b/i,
];

type ConsolidarObligacionInput = {
  obligacion: string;
  contrato: InformeMensualContrato;
  actividades: Actividad[];
  idsExcluidos?: Set<string>;
  contextoTecnico?: string | null;
  evidenciasPorActividad?: EvidenciasPorActividad;
};

type AgrupacionInformeItem = {
  frente: string;
  actividades_origen_ids: string[];
};

function obtenerTextoActividad(actividad: Actividad): string {
  return `${actividad.actividad_original} ${actividad.redaccion_ia} ${actividad.proyecto_detectado}`;
}

function normalizarClave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function esEcosistemaTecnologico(texto: string): boolean {
  const normalizado = normalizarClave(texto);

  if (ECOSISTEMA_INSUFICIENTE.has(normalizado)) {
    return true;
  }

  return TERMINOS_ECOSISTEMA.some(
    (termino) =>
      normalizado === termino ||
      normalizado.startsWith(`${termino} `) ||
      normalizado.endsWith(` ${termino}`) ||
      normalizado.includes(` ${termino} `)
  );
}

function esClaveAnclaConsolidacion(clave: string): boolean {
  return PREFIJOS_ANCLA_CONSOLIDACION.some((prefijo) => clave.startsWith(`${prefijo}:`));
}

function esClaveConsolidacionValida(clave: string): boolean {
  const normalizada = normalizarClave(
    clave.replace(/^(documento|entregable|proceso|proyecto|frente-trabajo):/, "")
  );

  if (ECOSISTEMA_INSUFICIENTE.has(normalizada)) {
    return false;
  }

  for (const insuficiente of ECOSISTEMA_INSUFICIENTE) {
    if (normalizada === insuficiente || normalizada.startsWith(`${insuficiente} `)) {
      return false;
    }
  }

  return true;
}

function detectarFrenteTrabajo(textoCompleto: string): DefinicionFrenteTrabajo | null {
  for (const definicion of DEFINICIONES_FRENTE_TRABAJO) {
    for (const patron of definicion.patrones) {
      if (patron.test(textoCompleto)) {
        patron.lastIndex = 0;
        return definicion;
      }

      patron.lastIndex = 0;
    }
  }

  return null;
}

export function extraerFrenteTrabajo(actividad: Actividad): string | null {
  return detectarFrenteTrabajo(obtenerTextoActividad(actividad))?.id ?? null;
}

export function detectarEcosistemaActividad(actividad: Actividad): EcosistemaId | null {
  return detectarFrenteTrabajo(obtenerTextoActividad(actividad))?.ecosistema ?? null;
}

function formatearEtiquetaFrente(frenteId: string): string {
  return (
    DEFINICIONES_FRENTE_TRABAJO.find((definicion) => definicion.id === frenteId)?.etiqueta ??
    frenteId
  );
}

function agregarClavesDesdePatrones(
  claves: Set<string>,
  textoCompleto: string,
  patrones: RegExp[],
  prefijo: string
): void {
  for (const patron of patrones) {
    const coincidencias = textoCompleto.match(patron);

    if (!coincidencias) {
      continue;
    }

    for (const coincidencia of coincidencias) {
      const clave = `${prefijo}:${normalizarClave(coincidencia)}`;

      if (esClaveConsolidacionValida(clave)) {
        claves.add(clave);
      }
    }
  }
}

function extraerClavesAncla(actividad: Actividad): Set<string> {
  const claves = new Set<string>();
  const textoCompleto = obtenerTextoActividad(actividad);
  const frente = detectarFrenteTrabajo(textoCompleto);

  agregarClavesDesdePatrones(
    claves,
    textoCompleto,
    PATRONES_DOCUMENTO_ESPECIFICO,
    "documento"
  );
  agregarClavesDesdePatrones(
    claves,
    textoCompleto,
    PATRONES_ENTREGABLE_ESPECIFICO,
    "entregable"
  );
  agregarClavesDesdePatrones(
    claves,
    textoCompleto,
    PATRONES_PROCESO_CONTRACTUAL,
    "proceso"
  );

  const otrosis = textoCompleto.match(/otros[ií]\s*\d+/gi);

  if (otrosis) {
    for (const coincidencia of otrosis) {
      const clave = `proceso:${normalizarClave(coincidencia)}`;

      if (esClaveConsolidacionValida(clave)) {
        claves.add(clave);
      }
    }
  }

  if (frente) {
    const patronesProceso = PATRONES_PROCESO_POR_FRENTE[frente.id] ?? [];
    let coincideProcesoOperativo = false;

    for (const patron of patronesProceso) {
      const coincidencias = textoCompleto.match(patron);

      if (!coincidencias) {
        patron.lastIndex = 0;
        continue;
      }

      coincideProcesoOperativo = true;

      for (const coincidencia of coincidencias) {
        const clave = `proceso:${normalizarClave(coincidencia)}`;

        if (esClaveConsolidacionValida(clave)) {
          claves.add(clave);
        }
      }

      patron.lastIndex = 0;
    }

    if (frente.id === "bca-pat") {
      const esEstudioBcaPat =
        /\bestudio(?:\s+de mercado)?\s+(?:para\s+)?(?:las\s+)?bca-?pat\b/gi.test(
          textoCompleto
        ) ||
        /\belaboraci[oó]n(?:\s+del|\s+de)?\s+estudio(?:\s+de mercado)?\s+(?:para\s+)?(?:las\s+)?bca-?pat\b/gi.test(
          textoCompleto
        ) ||
        /\bcontinuaci[oó]n(?:\s+del|\s+de)?\s+estudio(?:\s+de mercado)?\s+(?:para\s+)?(?:las\s+)?bca-?pat\b/gi.test(
          textoCompleto
        );

      if (esEstudioBcaPat) {
        claves.add("documento:estudio-bca-pat");
      }
    }

    if (coincideProcesoOperativo) {
      claves.add(`proceso:operativo-${frente.id}`);
    }
  }

  const proyecto = actividad.proyecto_detectado.trim();

  if (proyecto) {
    const claveProyecto = `proyecto:${normalizarClave(proyecto)}`;
    const texto = actividad.actividad_original.toLowerCase();

    if (
      texto.includes(proyecto.toLowerCase()) &&
      esClaveConsolidacionValida(claveProyecto) &&
      !ECOSISTEMA_INSUFICIENTE.has(normalizarClave(proyecto))
    ) {
      claves.add(claveProyecto);
    }
  }

  return new Set([...claves].filter(esClaveAnclaConsolidacion));
}

function extraerClavesConsolidacion(actividad: Actividad): Set<string> {
  const claves = extraerClavesAncla(actividad);
  const frente = extraerFrenteTrabajo(actividad);

  if (frente) {
    claves.add(`frente-trabajo:${frente}`);
  }

  return claves;
}

function inferirTemaActividad(actividad: Actividad): string {
  const frente = extraerFrenteTrabajo(actividad);

  if (frente) {
    return formatearEtiquetaFrente(frente);
  }

  const anclas = [...extraerClavesAncla(actividad)];

  if (anclas.length > 0) {
    return anclas[0].replace(/^(documento|entregable|proceso|proyecto):/, "");
  }

  const proyecto = actividad.proyecto_detectado.trim();

  if (proyecto && !esEcosistemaTecnologico(proyecto)) {
    return proyecto;
  }

  const original = actividad.actividad_original.trim();

  if (original.length <= 80) {
    return original;
  }

  return `${original.slice(0, 77)}...`;
}

function inferirTemaGrupo(actividades: Actividad[]): string {
  const frenteComun = obtenerFrenteTrabajoComun(actividades);

  if (frenteComun) {
    return formatearEtiquetaFrente(frenteComun);
  }

  const anclasComunes = obtenerAnclasConsolidacionComunes(actividades);

  if (anclasComunes.length > 0) {
    return anclasComunes[0].replace(/^(documento|entregable|proceso|proyecto):/, "");
  }

  return inferirTemaActividad(actividades[0]);
}

function obtenerFrenteTrabajoComun(actividades: Actividad[]): string | null {
  if (actividades.length === 0) {
    return null;
  }

  const frentes = actividades.map((actividad) => extraerFrenteTrabajo(actividad));

  if (frentes.some((frente) => !frente)) {
    return null;
  }

  const frenteReferencia = frentes[0]!;

  return frentes.every((frente) => frente === frenteReferencia) ? frenteReferencia : null;
}

function obtenerAnclasConsolidacionComunes(actividades: Actividad[]): string[] {
  if (actividades.length === 0) {
    return [];
  }

  const anclasReferencia = extraerClavesAncla(actividades[0]);

  return [...anclasReferencia].filter((clave) =>
    actividades.every((actividad) => extraerClavesAncla(actividad).has(clave))
  );
}

function obtenerClavesConsolidacionComunes(actividades: Actividad[]): string[] {
  return obtenerAnclasConsolidacionComunes(actividades);
}

function grupoTieneCohesionSemantica(actividades: Actividad[]): boolean {
  if (actividades.length <= 1) {
    return true;
  }

  const frenteComun = obtenerFrenteTrabajoComun(actividades);

  if (!frenteComun) {
    return false;
  }

  const anclasComunes = obtenerAnclasConsolidacionComunes(actividades);

  if (anclasComunes.length > 0) {
    return true;
  }

  return actividades.every((actividad) => extraerClavesAncla(actividad).size === 0);
}

export function identificarFrentesSugeridos(actividades: Actividad[]): string[] {
  return actividades
    .map((actividad) => inferirTemaActividad(actividad))
    .filter((tema, index, temas) => temas.indexOf(tema) === index)
    .sort((a, b) => a.localeCompare(b, "es"));
}

function ordenarAgrupacionesPorFecha(
  agrupaciones: AgrupacionInformeItem[],
  actividadesPorId: Map<string, Actividad>
): AgrupacionInformeItem[] {
  return [...agrupaciones].sort((a, b) => {
    const fechaA =
      a.actividades_origen_ids
        .map((id) => actividadesPorId.get(id)?.fecha ?? "")
        .sort()[0] ?? "";
    const fechaB =
      b.actividades_origen_ids
        .map((id) => actividadesPorId.get(id)?.fecha ?? "")
        .sort()[0] ?? "";

    return fechaA.localeCompare(fechaB) || a.frente.localeCompare(b.frente, "es");
  });
}

function construirCorpusOrigen(actividades: Actividad[]): string {
  return actividades
    .map((actividad) => `${actividad.actividad_original} ${actividad.redaccion_ia}`)
    .join(" ")
    .toLowerCase();
}

function contieneEcosistemaNoTrazable(
  sintesis: string,
  actividades: Actividad[]
): boolean {
  const corpusOrigen = construirCorpusOrigen(actividades);
  const sintesisNormalizada = sintesis.toLowerCase();

  if (
    PATRONES_ECOSISTEMA_PROHIBIDOS.some(
      (patron) => patron.test(sintesis) && !patron.test(corpusOrigen)
    )
  ) {
    return true;
  }

  return TERMINOS_ECOSISTEMA.some(
    (termino) => sintesisNormalizada.includes(termino) && !corpusOrigen.includes(termino)
  );
}

function normalizarNombreFrente(frente: string, actividades: Actividad[]): string {
  if (!esEcosistemaTecnologico(frente)) {
    return frente;
  }

  console.warn(
    `[Informe mensual] Frente "${frente}" identificado como ecosistema tecnológico. Se reemplazará por un nombre específico.`
  );

  return inferirTemaGrupo(actividades);
}

function pareceConcatenacion(sintesis: string, actividades: Actividad[]): boolean {
  const textos = actividades
    .map((actividad) => actividad.actividad_original.trim())
    .filter((texto) => texto.length >= 40);

  if (textos.length < 2) {
    return false;
  }

  const coincidencias = textos.filter((texto) => sintesis.includes(texto));
  return coincidencias.length >= 2;
}

function validarSintesisContractual(
  data: unknown,
  actividades: Actividad[]
): string {
  if (!data || typeof data !== "object") {
    throw new Error("La síntesis de OpenAI no es un objeto JSON válido.");
  }

  const record = data as Record<string, unknown>;
  const redaccion_consolidada = record.redaccion_consolidada;

  if (typeof redaccion_consolidada !== "string" || redaccion_consolidada.trim() === "") {
    throw new Error('La síntesis de OpenAI no contiene "redaccion_consolidada".');
  }

  const redaccion = redaccion_consolidada.trim();

  if (pareceConcatenacion(redaccion, actividades)) {
    throw new Error("La síntesis parece una concatenación de textos originales.");
  }

  if (contieneEcosistemaNoTrazable(redaccion, actividades)) {
    throw new Error(
      "La síntesis agrega SIRCI, SIGMP o ITS sin estar presentes en las actividades origen."
    );
  }

  return redaccion;
}

async function sintetizarGrupoContractual({
  obligacion,
  frente,
  contrato,
  actividades,
}: {
  obligacion: string;
  frente: string;
  contrato: InformeMensualContrato;
  actividades: Actividad[];
}): Promise<string> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SINTETIZAR_CONSOLIDACION_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildSintetizarConsolidacionUserPrompt({
          obligacion,
          frente,
          entidad: contrato.entidad,
          objetoContractual: contrato.objeto_contractual,
          actividades: actividades.map((actividad) => ({
            fecha: actividad.fecha,
            proyecto_detectado: actividad.proyecto_detectado,
            actividad_original: actividad.actividad_original,
            redaccion_ia: actividad.redaccion_ia,
          })),
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error(`OpenAI no devolvió síntesis para el frente "${frente}".`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`OpenAI devolvió JSON inválido en la síntesis del frente "${frente}".`);
  }

  return validarSintesisContractual(parsed, actividades);
}

async function sintetizarConsolidacionesDesdeAgrupaciones(
  agrupaciones: AgrupacionInformeItem[],
  actividades: Actividad[],
  obligacion: string,
  contrato: InformeMensualContrato
): Promise<ConsolidacionInformeResult["consolidaciones"]> {
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, actividad]));
  const consolidaciones: ConsolidacionInformeResult["consolidaciones"] = [];

  for (const agrupacion of agrupaciones) {
    const actividadesOrigen = agrupacion.actividades_origen_ids
      .map((id) => actividadesPorId.get(id))
      .filter((actividad): actividad is Actividad => Boolean(actividad))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (actividadesOrigen.length === 0) {
      continue;
    }

    try {
      const redaccion_consolidada = await sintetizarGrupoContractual({
        obligacion,
        frente: normalizarNombreFrente(agrupacion.frente, actividadesOrigen),
        contrato,
        actividades: actividadesOrigen,
      });

      consolidaciones.push({
        frente: normalizarNombreFrente(agrupacion.frente, actividadesOrigen),
        redaccion_consolidada,
        actividades_origen_ids: actividadesOrigen.map((actividad) => actividad.id),
      });
    } catch (error) {
      console.warn(
        `[Informe mensual] Frente "${agrupacion.frente}": falló la síntesis contractual. Se reintentará actividad por actividad.`,
        error
      );

      for (const actividad of actividadesOrigen) {
        try {
          const redaccion_consolidada = await sintetizarGrupoContractual({
            obligacion,
            frente: inferirTemaActividad(actividad),
            contrato,
            actividades: [actividad],
          });

          consolidaciones.push({
            frente: inferirTemaActividad(actividad),
            redaccion_consolidada,
            actividades_origen_ids: [actividad.id],
          });
        } catch (errorIndividual) {
          console.warn(
            `[Informe mensual] Actividad ${actividad.id}: falló la síntesis individual.`,
            errorIndividual
          );
        }
      }
    }
  }

  return consolidaciones;
}

function agruparActividadesMecanicoConservador(
  actividades: Actividad[]
): AgrupacionInformeItem[] {
  const grupos: Actividad[][] = [];

  for (const actividad of actividades) {
    let agregada = false;

    for (const grupo of grupos) {
      if (grupoTieneCohesionSemantica([...grupo, actividad])) {
        grupo.push(actividad);
        agregada = true;
        break;
      }
    }

    if (!agregada) {
      grupos.push([actividad]);
    }
  }

  return grupos.map((grupo) => ({
    frente:
      grupo.length === 1 ? inferirTemaActividad(grupo[0]) : inferirTemaGrupo(grupo),
    actividades_origen_ids: [...grupo]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((actividad) => actividad.id),
  }));
}

function separarGruposSinCohesionSemantica(
  agrupaciones: AgrupacionInformeItem[],
  actividades: Actividad[]
): AgrupacionInformeItem[] {
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, actividad]));
  const resultado: AgrupacionInformeItem[] = [];

  for (const agrupacion of agrupaciones) {
    const actividadesGrupo = agrupacion.actividades_origen_ids
      .map((id) => actividadesPorId.get(id))
      .filter((actividad): actividad is Actividad => Boolean(actividad))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (actividadesGrupo.length <= 1 || grupoTieneCohesionSemantica(actividadesGrupo)) {
      resultado.push({
        frente: agrupacion.frente,
        actividades_origen_ids: actividadesGrupo.map((actividad) => actividad.id),
      });
      continue;
    }

    console.warn(
      `[Informe mensual] Grupo "${agrupacion.frente}" sin cohesión (mismo frente + mismo documento/entregable/proceso). Se separará en actividades individuales.`
    );

    for (const actividad of actividadesGrupo) {
      resultado.push({
        frente: inferirTemaActividad(actividad),
        actividades_origen_ids: [actividad.id],
      });
    }
  }

  return resultado;
}

function normalizeActividadesOrigenIds(
  actividades_origen_ids: unknown,
  idsValidos: Set<string>,
  idsExcluidos: Set<string>,
  contexto: string
): string[] {
  if (actividades_origen_ids == null) {
    console.warn(
      `[Informe mensual] ${contexto}: actividades_origen_ids ausente. Se usará [].`
    );
    return [];
  }

  if (!Array.isArray(actividades_origen_ids)) {
    console.warn(
      `[Informe mensual] ${contexto}: actividades_origen_ids inválido. Se usará [].`
    );
    return [];
  }

  const ids = actividades_origen_ids.filter(
    (id): id is string => typeof id === "string" && id.trim() !== ""
  );

  return ids.filter((id) => idsValidos.has(id) && !idsExcluidos.has(id));
}

function normalizeParsedAgrupacionResponse(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.agrupaciones)) {
    return data;
  }

  if (Array.isArray(record.consolidaciones)) {
    console.warn(
      "[Informe mensual] OpenAI devolvió consolidaciones en lugar de agrupaciones. Se normalizarán sin usar redacción IA."
    );

    return {
      agrupaciones: record.consolidaciones.map((item) => {
        const agrupacion = item as Record<string, unknown>;
        return {
          frente: agrupacion.frente,
          actividades_origen_ids: agrupacion.actividades_origen_ids ?? [],
        };
      }),
    };
  }

  if (
    typeof record.frente === "string" &&
    (Array.isArray(record.actividades_origen_ids) || record.actividades_origen_ids == null)
  ) {
    console.warn(
      "[Informe mensual] OpenAI devolvió una agrupación suelta. Se normalizará automáticamente."
    );

    return {
      agrupaciones: [
        {
          frente: record.frente,
          actividades_origen_ids: record.actividades_origen_ids ?? [],
        },
      ],
    };
  }

  return data;
}

function validarAgrupacionInformeResult(
  data: unknown,
  actividades: Actividad[],
  idsExcluidos: Set<string>
): AgrupacionInformeItem[] {
  const normalizedData = normalizeParsedAgrupacionResponse(data);

  if (!normalizedData || typeof normalizedData !== "object") {
    throw new Error("La respuesta de OpenAI no es un objeto JSON válido.");
  }

  const record = normalizedData as Record<string, unknown>;

  if (!("agrupaciones" in record) || !Array.isArray(record.agrupaciones)) {
    throw new Error('La respuesta de OpenAI no contiene "agrupaciones".');
  }

  const idsValidos = new Set(actividades.map((actividad) => actividad.id));
  const agrupaciones: AgrupacionInformeItem[] = [];

  record.agrupaciones.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error("Cada agrupación debe ser un objeto.");
    }

    const agrupacion = item as Record<string, unknown>;
    const contexto = `Agrupación ${index + 1}`;
    let frente = typeof agrupacion.frente === "string" ? agrupacion.frente.trim() : "";

    if (!frente) {
      frente = "General";
      console.warn(
        `[Informe mensual] ${contexto}: frente ausente. Se usará "General".`
      );
    }

    const actividades_origen_ids = normalizeActividadesOrigenIds(
      agrupacion.actividades_origen_ids,
      idsValidos,
      idsExcluidos,
      contexto
    );

    if (actividades_origen_ids.length === 0) {
      return;
    }

    agrupaciones.push({
      frente: normalizarNombreFrente(frente, [
        ...actividades_origen_ids
          .map((id) => actividades.find((actividad) => actividad.id === id))
          .filter((actividad): actividad is Actividad => Boolean(actividad)),
      ]),
      actividades_origen_ids,
    });
  });

  if (agrupaciones.length === 0) {
    throw new Error("OpenAI no devolvió agrupaciones válidas.");
  }

  return agrupaciones;
}

function normalizarAgrupacionFrente(
  agrupacion: AgrupacionInformeItem,
  actividadesPorId: Map<string, Actividad>
): AgrupacionInformeItem {
  const actividadesGrupo = agrupacion.actividades_origen_ids
    .map((id) => actividadesPorId.get(id))
    .filter((actividad): actividad is Actividad => Boolean(actividad));

  return {
    ...agrupacion,
    frente: normalizarNombreFrente(agrupacion.frente, actividadesGrupo),
  };
}

function completarAgrupaciones(
  agrupaciones: AgrupacionInformeItem[],
  actividades: Actividad[]
): AgrupacionInformeItem[] {
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, actividad]));
  const idsAsignados = new Set<string>();
  const agrupacionesNormalizadas: AgrupacionInformeItem[] = [];

  for (const agrupacion of agrupaciones) {
    const idsUnicos = agrupacion.actividades_origen_ids.filter((id) => {
      if (idsAsignados.has(id) || !actividadesPorId.has(id)) {
        return false;
      }

      idsAsignados.add(id);
      return true;
    });

    if (idsUnicos.length === 0) {
      continue;
    }

    agrupacionesNormalizadas.push({
      frente: agrupacion.frente,
      actividades_origen_ids: idsUnicos,
    });
  }

  for (const actividad of actividades) {
    if (idsAsignados.has(actividad.id)) {
      continue;
    }

    agrupacionesNormalizadas.push({
      frente: inferirTemaActividad(actividad),
      actividades_origen_ids: [actividad.id],
    });
    idsAsignados.add(actividad.id);

    console.warn(
      `[Informe mensual] Actividad ${actividad.id} no fue agrupada por OpenAI. Se mantendrá sola.`
    );
  }

  return ordenarAgrupacionesPorFecha(
    separarGruposSinCohesionSemantica(agrupacionesNormalizadas, actividades).map(
      (agrupacion) => normalizarAgrupacionFrente(agrupacion, actividadesPorId)
    ),
    actividadesPorId
  );
}

async function agruparActividadesConOpenAI(
  obligacion: string,
  contrato: InformeMensualContrato,
  actividades: Actividad[],
  idsExcluidos: Set<string>,
  contextoTecnico?: string | null
): Promise<AgrupacionInformeItem[]> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: AGRUPAR_INFORME_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildAgruparObligacionUserPrompt({
          obligacion,
          entidad: contrato.entidad,
          objetoContractual: contrato.objeto_contractual,
          contextoTecnico,
          actividades: actividades.map((actividad) => ({
            id: actividad.id,
            fecha: actividad.fecha,
            proyecto_detectado: actividad.proyecto_detectado,
            actividad_original: actividad.actividad_original,
            redaccion_ia: actividad.redaccion_ia,
          })),
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI no devolvió contenido en la agrupación.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI devolvió un JSON inválido en la agrupación.");
  }

  const agrupaciones = validarAgrupacionInformeResult(parsed, actividades, idsExcluidos);
  return completarAgrupaciones(agrupaciones, actividades);
}

export function mapConsolidacionesConFechas(
  consolidaciones: ConsolidacionInformeResult["consolidaciones"],
  actividades: Actividad[],
  evidenciasPorActividad: EvidenciasPorActividad = {}
): InformeMensualActividadConsolidada[] {
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, actividad]));

  return consolidaciones.map((consolidacion) => {
    const fechas_origen = consolidacion.actividades_origen_ids
      .map((id) => actividadesPorId.get(id)?.fecha)
      .filter((fecha): fecha is string => Boolean(fecha))
      .sort((a, b) => a.localeCompare(b));

    const evidencias: InformeMensualEvidencia[] = recolectarEvidenciasDeActividades(
      consolidacion.actividades_origen_ids,
      evidenciasPorActividad
    ).map((evidencia) => ({
      id: evidencia.id,
      actividad_id: evidencia.actividad_id,
      url: evidencia.url,
      nombre_archivo: evidencia.nombre_archivo,
      created_at: evidencia.created_at,
    }));

    return {
      frente: consolidacion.frente,
      redaccion_consolidada: consolidacion.redaccion_consolidada,
      actividades_origen_ids: consolidacion.actividades_origen_ids,
      fechas_origen,
      evidencias,
    };
  });
}

export async function consolidarObligacionInforme({
  obligacion,
  contrato,
  actividades,
  idsExcluidos = new Set<string>(),
  contextoTecnico = null,
  evidenciasPorActividad = {},
}: ConsolidarObligacionInput): Promise<InformeMensualActividadConsolidada[]> {
  const actividadesDisponibles = actividades
    .filter((actividad) => !idsExcluidos.has(actividad.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (actividadesDisponibles.length === 0) {
    return [];
  }

  let agrupaciones: AgrupacionInformeItem[];

  try {
    agrupaciones = await agruparActividadesConOpenAI(
      obligacion,
      contrato,
      actividadesDisponibles,
      idsExcluidos,
      contextoTecnico
    );
  } catch (error) {
    console.warn(
      `[Informe mensual] Obligación "${obligacion}": falló la agrupación con OpenAI. Se usará agrupación mecánica conservadora.`,
      error
    );
    agrupaciones = completarAgrupaciones(
      agruparActividadesMecanicoConservador(actividadesDisponibles),
      actividadesDisponibles
    );
  }

  const consolidaciones = await sintetizarConsolidacionesDesdeAgrupaciones(
    agrupaciones,
    actividadesDisponibles,
    obligacion,
    contrato
  );

  if (consolidaciones.length === 0) {
    throw new Error(
      `No se pudo sintetizar ninguna consolidación para la obligación "${obligacion}".`
    );
  }

  return mapConsolidacionesConFechas(
    consolidaciones,
    actividadesDisponibles,
    evidenciasPorActividad
  );
}
