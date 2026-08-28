import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import { getConfiguracionIA, toConfiguracionIAContext } from "@/lib/configuracion-ia";
import {
  buildRegenerarRedaccionUserPrompt,
  REGENERAR_REDACCION_SYSTEM_PROMPT,
} from "@/lib/prompts/regenerar-redaccion-actividad";
import type { ContratoActivo } from "@/lib/pipeline-analisis-actividad";
import type { AnalisisActividadResult } from "@/types/analisis-actividad";

type RedaccionRegenerada = Pick<AnalisisActividadResult, "redaccion_ia" | "resumen_ia">;

function validarRedaccionRegenerada(data: unknown): RedaccionRegenerada | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.redaccion_ia !== "string" || typeof record.resumen_ia !== "string") {
    return null;
  }

  const redaccion_ia = record.redaccion_ia.trim();
  const resumen_ia = record.resumen_ia.trim();

  if (!redaccion_ia || !resumen_ia) {
    return null;
  }

  return { redaccion_ia, resumen_ia };
}

export async function regenerarRedaccionActividad(
  contrato: ContratoActivo,
  actividadOriginal: string,
  analisisBase: AnalisisActividadResult
): Promise<RedaccionRegenerada> {
  const configuracion = toConfiguracionIAContext(await getConfiguracionIA().catch(() => null));

  const completion = await getOpenAIClient().chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.65,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: REGENERAR_REDACCION_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildRegenerarRedaccionUserPrompt({
          nombre: contrato.nombre,
          entidad: contrato.entidad,
          objetoContractual: contrato.objeto_contractual,
          actividadOriginal,
          analisisBase,
          configuracion,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI no devolvió contenido al regenerar la redacción.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI devolvió un JSON inválido al regenerar la redacción.");
  }

  const regenerada = validarRedaccionRegenerada(parsed);

  if (!regenerada) {
    throw new Error("La respuesta de regeneración no contiene redacción y resumen válidos.");
  }

  return regenerada;
}
