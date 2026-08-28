import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import { validarObligacionDetectada } from "@/lib/clasificar-obligacion";
import { combinarTextoReglasConfiguracion } from "@/lib/configuracion-ia";
import { aplicarReglasNoExpandirRedaccion } from "@/lib/reglas-configuracion-ia-redaccion";
import {
  ANALIZAR_ACTIVIDAD_SYSTEM_PROMPT,
  buildAnalizarActividadUserPrompt,
} from "@/lib/prompts/analizar-actividad";
import type { AnalisisActividadResult } from "@/types/analisis-actividad";
import type { ConfiguracionIAContext } from "@/types/configuracion-ia";

type AnalizarActividadInput = {
  nombre: string;
  entidad: string;
  objetoContractual: string;
  obligaciones: string;
  actividadOriginal: string;
  configuracion?: ConfiguracionIAContext | null;
};

const REQUIRED_FIELDS = [
  "tipo_actividad_detectada",
  "proyecto_detectado",
  "obligacion_detectada",
  "redaccion_ia",
  "resumen_ia",
  "palabras_clave",
] as const;

function validateAnalisisActividadResult(data: unknown): Omit<
  AnalisisActividadResult,
  "obligacion_detectada" | "tipo_actividad_detectada" | "puntaje_clasificacion"
> & {
  obligacion_detectada: string;
  tipo_actividad_detectada: string;
} {
  if (!data || typeof data !== "object") {
    throw new Error("La respuesta de OpenAI no es un objeto JSON válido.");
  }

  const record = data as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in record)) {
      throw new Error(`La respuesta de OpenAI no contiene el campo "${field}".`);
    }
  }

  const {
    tipo_actividad_detectada,
    proyecto_detectado,
    obligacion_detectada,
    redaccion_ia,
    resumen_ia,
    palabras_clave,
  } = record;

  if (typeof tipo_actividad_detectada !== "string") {
    throw new Error('El campo "tipo_actividad_detectada" debe ser un string.');
  }

  if (typeof proyecto_detectado !== "string") {
    throw new Error('El campo "proyecto_detectado" debe ser un string.');
  }

  if (typeof obligacion_detectada !== "string") {
    throw new Error('El campo "obligacion_detectada" debe ser un string.');
  }

  if (typeof redaccion_ia !== "string") {
    throw new Error('El campo "redaccion_ia" debe ser un string.');
  }

  if (typeof resumen_ia !== "string") {
    throw new Error('El campo "resumen_ia" debe ser un string.');
  }

  if (!Array.isArray(palabras_clave)) {
    throw new Error('El campo "palabras_clave" debe ser un arreglo.');
  }

  if (!palabras_clave.every((item) => typeof item === "string")) {
    throw new Error('El campo "palabras_clave" debe contener únicamente strings.');
  }

  return {
    tipo_actividad_detectada,
    proyecto_detectado,
    obligacion_detectada,
    redaccion_ia,
    resumen_ia,
    palabras_clave,
  };
}

export async function analizarActividad(
  input: AnalizarActividadInput
): Promise<AnalisisActividadResult> {
  const completion = await getOpenAIClient().chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ANALIZAR_ACTIVIDAD_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildAnalizarActividadUserPrompt({
          nombre: input.nombre,
          entidad: input.entidad,
          objetoContractual: input.objetoContractual,
          obligaciones: input.obligaciones,
          actividadOriginal: input.actividadOriginal,
          configuracion: input.configuracion,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI no devolvió contenido en la respuesta.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI devolvió un JSON inválido.");
  }

  const analisisIa = validateAnalisisActividadResult(parsed);
  const clasificacion = validarObligacionDetectada({
    actividadOriginal: input.actividadOriginal,
    obligacionesTexto: input.obligaciones,
    obligacionDetectadaIa: analisisIa.obligacion_detectada,
    tipoActividadDetectadaIa: analisisIa.tipo_actividad_detectada,
  });

  const textoReglas = combinarTextoReglasConfiguracion(input.configuracion);

  const redaccionAjustada = aplicarReglasNoExpandirRedaccion({
    redaccion_ia: analisisIa.redaccion_ia,
    resumen_ia: analisisIa.resumen_ia,
    actividadOriginal: input.actividadOriginal,
    textoReglas,
  });

  return {
    ...analisisIa,
    ...redaccionAjustada,
    obligacion_detectada: clasificacion.obligacion_detectada,
    tipo_actividad_detectada: clasificacion.tipo_actividad_detectada,
    puntaje_clasificacion: clasificacion.puntaje,
  };
}
