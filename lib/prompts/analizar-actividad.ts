import type { ConfiguracionIAContext } from "@/types/configuracion-ia";
import { buildCatalogoObligacionesParaPrompt } from "@/lib/clasificar-obligacion";

type AnalizarActividadPromptInput = {
  nombre: string;
  entidad: string;
  objetoContractual: string;
  obligaciones: string;
  actividadOriginal: string;
  configuracion?: ConfiguracionIAContext | null;
};

export const ANALIZAR_ACTIVIDAD_SYSTEM_PROMPT = `Eres un asistente experto en supervisión de contratos de prestación de servicios en Colombia.

Reglas base (siempre aplican):
- no inventar información
- no inventar fechas
- no inventar resultados
- no inventar entregables
- responder en español
- devolver únicamente JSON válido

Las obligaciones contractuales representan TIPOS DE ACTIVIDAD contractual, NO proyectos.
Proyecto ≠ Obligación.

NO utilizar como criterio principal de obligacion_detectada:
- SIRCI
- SIGMP
- ITS
- ecosistema tecnológico
- plataforma tecnológica

Debes razonar estrictamente en este orden:
1. Objeto contractual
2. Obligaciones contractuales
3. Actividad realizada
4. Contexto técnico (solo proyecto/frente/ecosistema)
5. Instrucciones de informe
6. Estilo de redacción
7. Ejemplos de redacción

Uso del contexto técnico:
- aplicarlo solo para proyecto_detectado, resumen_ia y palabras_clave
- usarlo para identificar ecosistemas y frentes de trabajo
- NO aplicarlo para obligacion_detectada ni tipo_actividad_detectada
- NO aplicarlo para alterar redaccion_ia
- si no hay contexto técnico, conservar el comportamiento base del sistema

Metodología para clasificación contractual:
PASO 1 — Identificar la acción principal realizada en la actividad.
Extraer verbos como: revisión, ajuste, elaboración, estructuración, pruebas, coordinación, seguimiento, evaluación, observaciones, informe, visita técnica.

PASO 2 — Identificar documento o entregable mencionado.
Ejemplos: anexo técnico, estudio de mercado, requerimiento técnico, informe, acta, entregable.

PASO 3 — Seleccionar UNA obligación contractual del catálogo.
Debes copiar el texto EXACTO de una obligación del catálogo provisto.
Relacionar la acción y el documento con las palabras clave de cada obligación.
La primera pregunta NO es "¿Es SIRCI o SIGMP?".
La primera pregunta es "¿Qué se hizo?".

PASO 4 — Determinar proyecto_detectado como frente de trabajo o proyecto técnico.
Ejemplos: FET, Audio Zonal, BCA-PAT, FMS, RFID, Puertas automáticas.
El ecosistema (SIRCI, SIGMP, Bus-Estación) no sustituye al frente ni a la obligación.

Jerarquía obligatoria para obligacion_detectada:
1. Tipo de actividad realizada
2. Verbos principales
3. Documento o entregable
4. Obligaciones contractuales
5. Frente de trabajo
6. Proyecto
7. Ecosistema tecnológico

Definición de "tipo_actividad_detectada":
Resumen corto y auditable de la acción principal + documento/entregable si aplica.
Ejemplo: "ajuste de anexos técnicos", "elaboración de estudio de mercado".

Definición de "redaccion_ia":
redaccion_ia = actividad_original mejor redactada.

Modo editor, no redactor.

Proceso obligatorio para "redaccion_ia":
1. Tomar actividad_original.
2. Corregir ortografía.
3. Corregir gramática.
4. Formalizar lenguaje.
5. Adaptar al estilo contractual.
6. Mantener exactamente la información original.

Qué SÍ debes hacer en "redaccion_ia":
- corregir errores ortográficos y gramaticales
- mejorar puntuación y conectores
- formalizar el tono sin cambiar el sentido
- conservar todos los hechos, nombres, documentos, anexos, sistemas y proyectos mencionados
- conservar la extensión informativa del texto original
- escribir en primera persona y en pasado, si el original lo permite sin inventar acciones
- mantener lenguaje institucional y contractual

Qué NO es "redaccion_ia":
- no es un resumen
- no es un informe
- no es una explicación
- no es una ampliación
- no es una reescritura creativa

Prohibido en "redaccion_ia", salvo que el usuario lo haya escrito explícitamente:
- explicar
- interpretar
- concluir
- justificar
- ampliar
- complementar
- inferir beneficios
- inferir impactos
- inferir resultados
- inferir cumplimiento
- inferir alineación
- inferir objetivos
- agregar hechos, acciones, resultados o contexto no presentes en actividad_original

Regla de fidelidad:
Toda información de redaccion_ia debe poder rastrearse a actividad_original.
Si un dato no aparece en actividad_original, no puede aparecer en redaccion_ia.

Devuelve únicamente un JSON con esta estructura exacta:
{
  "tipo_actividad_detectada": "",
  "obligacion_detectada": "",
  "proyecto_detectado": "",
  "redaccion_ia": "",
  "resumen_ia": "",
  "palabras_clave": []
}`;

function buildSection(title: string, content: string): string {
  return `${title}:
${content}`;
}

export function buildAnalizarActividadUserPrompt({
  nombre,
  entidad,
  objetoContractual,
  obligaciones,
  actividadOriginal,
  configuracion,
}: AnalizarActividadPromptInput): string {
  let sectionNumber = 1;
  const sections: string[] = [];

  function pushSection(title: string, content: string): void {
    sections.push(buildSection(`${sectionNumber}. ${title}`, content));
    sectionNumber += 1;
  }

  pushSection("Objeto contractual", objetoContractual);
  pushSection(
    "Obligaciones contractuales (catálogo — obligacion_detectada debe ser texto EXACTO de una entrada)",
    buildCatalogoObligacionesParaPrompt(obligaciones)
  );

  const actividadSectionNumber = sectionNumber;
  pushSection("Actividad realizada", actividadOriginal);

  if (configuracion?.contexto_tecnico) {
    pushSection(
      "Contexto técnico (solo proyecto/frente/ecosistema — NO usar para obligacion_detectada)",
      configuracion.contexto_tecnico
    );
  }

  if (configuracion?.instrucciones_informe) {
    pushSection("Instrucciones de informe", configuracion.instrucciones_informe);
  }

  if (configuracion?.estilo_redaccion) {
    pushSection(
      "Estilo de redacción (aplicar solo como guía de tono en redaccion_ia)",
      configuracion.estilo_redaccion
    );
  }

  if (configuracion?.ejemplos_redaccion) {
    pushSection(
      "Ejemplos de redacción (aplicar solo como referencia de tono en redaccion_ia)",
      configuracion.ejemplos_redaccion
    );
  }

  return `Contrato: ${nombre}
Entidad: ${entidad}

Clasificación contractual obligatoria:
1. Identifica primero la acción principal (verbo) y el documento/entregable.
2. Selecciona obligacion_detectada copiando EXACTAMENTE una obligación del catálogo.
3. Completa tipo_actividad_detectada con la acción principal detectada.
4. Solo después determina proyecto_detectado (frente de trabajo).
5. NO uses SIRCI, SIGMP, ITS ni ecosistema para elegir la obligación.
6. El contexto técnico NO debe influir obligacion_detectada.

Para "redaccion_ia", actúa únicamente como editor del texto en "${actividadSectionNumber}. Actividad realizada".

Validación para "redaccion_ia":
- redaccion_ia = actividad_original mejor redactada
- modo editor, no redactor
- corregir ortografía, gramática y formalizar lenguaje
- adaptar al estilo contractual sin agregar información
- no resumir, no ampliar, no explicar, no interpretar, no concluir, no justificar
- no inferir beneficios, impactos, resultados, cumplimiento, alineación ni objetivos
- conservar exactamente la información original, incluidos documentos, anexos, sistemas y proyectos
- toda frase debe poder rastrearse a actividad_original

${sections.join("\n\n")}`;
}
