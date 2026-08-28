import type { ConfiguracionIAContext } from "@/types/configuracion-ia";
import type { AnalisisActividadResult } from "@/types/analisis-actividad";
import { inyectarConfiguracionRegenerarRedaccion } from "@/lib/prompts/configuracion-ia-prompt";

type RegenerarRedaccionPromptInput = {
  nombre: string;
  entidad: string;
  objetoContractual: string;
  actividadOriginal: string;
  analisisBase: AnalisisActividadResult;
  configuracion?: ConfiguracionIAContext | null;
};

export const REGENERAR_REDACCION_SYSTEM_PROMPT = `Eres un redactor contractual experto en supervisión de contratos de prestación de servicios en Colombia.

Tu tarea es ÚNICAMENTE regenerar "redaccion_ia" y "resumen_ia".
NO debes modificar, inferir ni devolver obligación, proyecto, tipo de actividad ni palabras clave.

Prioridad para "redaccion_ia" y "resumen_ia":
Las reglas del contrato (sección del user prompt) prevalecen sobre estilo, ejemplos y este system prompt.
Si las reglas prohíben expandir una sigla, NO la expandas aunque el estilo o los ejemplos sugieran lo contrario.

Fuentes permitidas: actividad_original, reglas del contrato, estilo de redacción, ejemplos de redacción.
NO uses contexto técnico: la clasificación ya está fijada.

Instrucción principal:
Genera una nueva formulación manteniendo exactamente el mismo significado.

Reglas de variación:
- Usa estructura de oraciones diferente a la redacción anterior.
- Usa verbos y conectores distintos cuando sea posible.
- NO repitas la redacción anterior palabra por palabra.
- Conserva todos los hechos, entidades, documentos, sistemas y siglas de actividad_original.
- Mantén coherencia con la obligación y el proyecto ya fijados (solo como contexto, no los reescribas).

Reglas contractuales para redaccion_ia (obligatorias; subordinadas a reglas personalizadas):
- redacción contractual y técnica profesional en primera persona y pasado
- convertir notas telegráficas en oraciones completas con la acción desarrollada
- desarrollar verbos y objetos implícitos en actividad_original (ej.: "validación equipamiento" → "validación de la instalación de equipamiento")
- conservar siglas de actividad_original sin expandirlas (SIRCI, ZMO, ETIB, etc. se mantienen literales)
- NO entregar redacciones mínimas sin acción (ej. prohibido: "Apoyé a la Dirección de TIC, ZMO." si el original describe una acción)
- NO explicar para qué, por qué, qué beneficio generó ni qué resultado produjo
- NO inventar información, fechas, resultados, ecosistemas ni proyectos no mencionados
- NO referirse a imágenes, fotografías, evidencias o archivos adjuntos
- NO expandir siglas a nombre completo salvo regla personalizada explícita del usuario
- prohibido: "asegurando", "garantizando", "con el fin de", "para atender", "en el marco de", "asociado a", "relacionado con"
- toda información sustantiva debe rastrearse a actividad_original

Para resumen_ia:
- síntesis breve y fiel de la nueva redaccion_ia
- coherente con la redacción regenerada
- sin agregar hechos nuevos

Responde en español.
Devuelve únicamente JSON válido con esta estructura exacta:
{
  "redaccion_ia": "",
  "resumen_ia": ""
}`;

function buildSection(title: string, content: string): string {
  return `${title}:
${content}`;
}

export function buildRegenerarRedaccionUserPrompt({
  nombre,
  entidad,
  objetoContractual,
  actividadOriginal,
  analisisBase,
  configuracion,
}: RegenerarRedaccionPromptInput): string {
  let sectionNumber = 1;
  const sections: string[] = [];

  function pushSection(title: string, content: string): void {
    sections.push(buildSection(`${sectionNumber}. ${title}`, content));
    sectionNumber += 1;
  }

  pushSection("Objeto contractual", objetoContractual);
  pushSection("Actividad realizada (fuente de hechos)", actividadOriginal);

  inyectarConfiguracionRegenerarRedaccion({
    pushSection,
    configuracion,
  });

  pushSection(
    "Clasificación fijada (NO modificar — solo contexto)",
    [
      `Obligación: ${analisisBase.obligacion_detectada}`,
      `Proyecto: ${analisisBase.proyecto_detectado}`,
      `Tipo de actividad: ${analisisBase.tipo_actividad_detectada}`,
    ].join("\n")
  );
  pushSection(
    "Redacción anterior (NO repetir — generar formulación distinta)",
    analisisBase.redaccion_ia
  );
  pushSection("Resumen anterior (referencia)", analisisBase.resumen_ia);

  return `Contrato: ${nombre}
Entidad: ${entidad}

Genera una nueva formulación de redaccion_ia y resumen_ia.
Mantén exactamente el mismo significado y hechos.
Usa redacción distinta a la anterior.
NO reclasifiques obligación, proyecto ni tipo de actividad.

Fuentes: actividad realizada, reglas del contrato, estilo de redacción, ejemplos de redacción.
NO uses contexto técnico.

Las reglas del contrato prevalecen sobre estilo y ejemplos.

${sections.join("\n\n")}`;
}
