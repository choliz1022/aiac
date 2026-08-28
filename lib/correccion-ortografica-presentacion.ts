import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import type { AnalisisActividadResult } from "@/types/analisis-actividad";

const PROMPT_SISTEMA = `Eres un corrector ortográfico y gramatical en español (Colombia).

Reglas:
- Corrige únicamente ortografía, gramática, puntuación y mayúsculas.
- NO cambies el significado.
- NO agregues información.
- NO elimines información.
- NO reformules estilo ni tono.
- Conserva nombres propios, siglas y términos técnicos.
- Devuelve únicamente JSON válido con los mismos campos recibidos.`;

type CamposCorregibles = Pick<AnalisisActividadResult, "resumen_ia" | "redaccion_ia">;

function parsearCamposCorregidos(data: unknown): CamposCorregibles | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.resumen_ia !== "string" || typeof record.redaccion_ia !== "string") {
    return null;
  }

  return {
    resumen_ia: record.resumen_ia.trim(),
    redaccion_ia: record.redaccion_ia.trim(),
  };
}

export async function corregirOrtografiaCamposPresentacion(
  analisis: AnalisisActividadResult
): Promise<AnalisisActividadResult> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        {
          role: "user",
          content: JSON.stringify({
            resumen_ia: analisis.resumen_ia,
            redaccion_ia: analisis.redaccion_ia,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return analisis;
    }

    const parsed = JSON.parse(content) as unknown;
    const corregidos = parsearCamposCorregidos(parsed);

    if (!corregidos) {
      return analisis;
    }

    return {
      ...analisis,
      resumen_ia: corregidos.resumen_ia || analisis.resumen_ia,
      redaccion_ia: corregidos.redaccion_ia || analisis.redaccion_ia,
    };
  } catch {
    return analisis;
  }
}
