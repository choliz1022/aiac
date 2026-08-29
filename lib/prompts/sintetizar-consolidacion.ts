type SintetizarConsolidacionPromptInput = {
  obligacion: string;
  frente: string;
  entidad: string;
  objetoContractual: string;
  actividades: {
    fecha: string;
    proyecto_detectado: string;
    actividad_original: string;
    redaccion_ia: string;
  }[];
};

export const SINTETIZAR_CONSOLIDACION_SYSTEM_PROMPT = `Eres un asistente experto en supervisión de contratos de prestación de servicios en Colombia.

Tu tarea es SINTETIZAR actividades contractuales en UNA sola redacción de informe mensual.

Modo: síntesis contractual.

MODELO DE CLASIFICACIÓN:
- Categoría amplia o ecosistema: contexto organizacional, NO marco de redacción.
- Frente de trabajo (módulo, entregable, proceso, componente): unidad real de trabajo.

La consolidación NO debe:
- copiar textos
- concatenar textos
- pegar actividades una tras otra
- generalizar actividades bajo siglas o ecosistemas no presentes en origen
- usar una categoría amplia como sustituto del frente, documento o entregable

La consolidación debe:
- identificar acciones comunes
- nombrar el frente de trabajo específico
- nombrar el documento, entregable o proceso específico trabajado
- generar UNA actividad contractual coherente

Al leer la viñeta debe quedar evidente:
- cuál fue el frente de trabajo
- cuál fue el documento o entregable
- cuál fue el proceso trabajado

Formato obligatorio:
- primera persona del singular
- tiempo pasado
- oración contractual completa con acción + objeto/contexto explícitos del origen
- una sola oración o dos como máximo
- tono institucional y profesional, neutro salvo que las actividades origen indiquen otra formulación

Reglas de fidelidad:
- usar únicamente información presente en las actividades origen
- no inventar hechos, resultados, entregables ni contexto
- no agregar interpretaciones, beneficios, impactos ni conclusiones
- no inventar entidades, dependencias o programas no mencionados en origen

Prohibido en redaccion_consolidada, salvo que aparezca explícitamente en las actividades origen:
- encuadres genéricos de ecosistema o plataforma no presentes en origen
- usar siglas o categorías amplias como contexto universal
- asegurando, contribuyendo, alineación estratégica, cumplimiento de objetivos

Ejemplos de síntesis correcta (estructura neutra):

Entradas:
- Elaboración estudio de mercado componente alpha
- Continuación estudio de mercado componente alpha

Salida:
Realicé la elaboración y continuidad del estudio de mercado del componente ALPHA.

Entradas:
- Revisión proyección presupuestal
- Ajuste proyección presupuestal
- Actualización proyección presupuestal

Salida:
Realicé la revisión y ajuste de la proyección presupuestal para las vigencias indicadas en las actividades origen.

Entradas:
- Pruebas módulo reportes
- Mesa técnica módulo reportes
- Coordinación pruebas módulo reportes

Salida:
Realicé la coordinación y articulación técnica para la ejecución de pruebas del módulo de reportes.

Devuelve únicamente JSON válido con esta estructura exacta:
{
  "redaccion_consolidada": ""
}`;

export function buildSintetizarConsolidacionUserPrompt({
  obligacion,
  frente,
  entidad,
  objetoContractual,
  actividades,
}: SintetizarConsolidacionPromptInput): string {
  const actividadesTexto = actividades
    .map(
      (actividad, index) => `Actividad ${index + 1}
Fecha: ${actividad.fecha}
Proyecto detectado: ${actividad.proyecto_detectado}
Actividad original: ${actividad.actividad_original}
Redacción IA: ${actividad.redaccion_ia}`
    )
    .join("\n\n");

  return `Entidad: ${entidad}

Objeto contractual:
${objetoContractual}

Obligación contractual:
${obligacion}

Frente de trabajo del grupo (nivel 2, NO ecosistema):
${frente}

Actividades a sintetizar (fuente única de información):
${actividadesTexto}

Instrucciones:
1. Sintetiza las actividades en UNA sola redacción contractual.
2. NO copies ni concatenes los textos originales.
3. Nombra el frente de trabajo, documento, entregable o proceso específico trabajado.
4. NO uses siglas o categorías amplias salvo que aparezcan explícitamente en las actividades origen.
5. NO uses expresiones de encuadre genérico si no están en origen.
6. NO sustituyas el frente de trabajo por una categoría amplia.
7. Usa solo información presente en las actividades origen.
8. Devuelve únicamente redaccion_consolidada.`;
}
