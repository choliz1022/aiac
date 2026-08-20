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
- Ecosistema (SIRCI, SIGMP, Bus-Estación): contexto organizacional, NO marco de redacción.
- Frente de trabajo (FET, BCA-PAT, Audio Zonal, Puertas automáticas, etc.): unidad real de trabajo.

La consolidación NO debe:
- copiar textos
- concatenar textos
- pegar actividades una tras otra
- generalizar actividades bajo SIRCI, SIGMP o ITS
- usar el ecosistema como sustituto del frente, documento o entregable

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
- primera persona
- pasado
- preferir inicio: "Apoyé la Dirección de TIC, con..."
- una sola oración o dos como máximo
- tono institucional y contractual

Reglas de fidelidad:
- usar únicamente información presente en las actividades origen
- no inventar hechos, resultados, entregables ni contexto
- no agregar interpretaciones, beneficios, impactos ni conclusiones

Prohibido en redaccion_consolidada, salvo que aparezca explícitamente en las actividades origen:
- en el marco del SIGMP
- asociado al SIGMP
- relacionado con SIGMP
- relacionado con SIRCI
- relacionado con ITS
- usar SIRCI, SIGMP o ITS como contexto universal
- asegurando, contribuyendo, alineación estratégica, cumplimiento de objetivos

Ejemplos de síntesis correcta:

Entradas:
- Elaboración estudio de mercado BCA-PAT
- Continuación estudio de mercado BCA-PAT

Salida:
Apoyé la Dirección de TIC, con la elaboración y continuidad del estudio de mercado para las BCA-PAT de ETIB.

Entradas:
- Revisión FET
- Ajuste FET
- Proyección económica FET

Salida:
Apoyé la Dirección de TIC, con la revisión y ajuste de la proyección de recursos económicos del Fondo de Estabilización Tarifaria (FET) para las vigencias 2027 y 2028.

Entradas:
- Pruebas audio zonal
- Mesa técnica audio zonal
- Coordinación pruebas audio zonal

Salida:
Apoyé la Dirección de TIC, con la coordinación y articulación técnica para la ejecución de pruebas asociadas al proyecto de audio zonal.

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
4. NO uses SIRCI, SIGMP ni ITS salvo que aparezcan explícitamente en las actividades origen.
5. NO uses expresiones como "en el marco del SIGMP" o "relacionado con SIRCI" si no están en origen.
6. NO sustituyas el frente de trabajo por el ecosistema.
7. Usa solo información presente en las actividades origen.
8. Devuelve únicamente redaccion_consolidada.`;
}
