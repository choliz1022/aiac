import type { ConfiguracionIAContext } from "@/types/configuracion-ia";

export const ENCABEZADO_REGLAS_CONTRATO = `Estas reglas del contrato tienen prioridad sobre el system prompt cuando exista conflicto.`;

type InyectarConfiguracionOptions = {
  pushSection: (title: string, content: string) => void;
  configuracion?: ConfiguracionIAContext | null;
};

export function inyectarReglasContrato({
  pushSection,
  configuracion,
  alcance,
}: InyectarConfiguracionOptions & { alcance: string }): void {
  if (!configuracion?.instrucciones_informe) {
    return;
  }

  pushSection(
    "Reglas del contrato",
    `${ENCABEZADO_REGLAS_CONTRATO}\n\nAlcance: ${alcance}\n\n${configuracion.instrucciones_informe}`
  );
}

export function inyectarContextoTecnicoClasificacion({
  pushSection,
  configuracion,
}: InyectarConfiguracionOptions): void {
  if (!configuracion?.contexto_tecnico) {
    return;
  }

  pushSection(
    "Contexto técnico y frentes (solo clasificación)",
    `${configuracion.contexto_tecnico}

Usar únicamente para: obligacion_detectada, tipo_actividad_detectada, proyecto_detectado y palabras_clave.
NO usar para redaccion_ia ni resumen_ia.`
  );
}

export function inyectarEstiloRedaccion({
  pushSection,
  configuracion,
}: InyectarConfiguracionOptions): void {
  if (!configuracion?.estilo_redaccion) {
    return;
  }

  pushSection(
    "Estilo de redacción (solo redacción)",
    `${configuracion.estilo_redaccion}

Usar únicamente para redaccion_ia y resumen_ia. NO usar para clasificar.`
  );
}

export function inyectarEjemplosRedaccion({
  pushSection,
  configuracion,
}: InyectarConfiguracionOptions): void {
  if (!configuracion?.ejemplos_redaccion) {
    return;
  }

  pushSection(
    "Ejemplos de redacción (solo redacción)",
    `${configuracion.ejemplos_redaccion}

Usar únicamente como referencia para redaccion_ia y resumen_ia. NO usar para clasificar.`
  );
}

/** Config IA completa para análisis de actividad (clasificación + redacción separadas por sección). */
export function inyectarConfiguracionAnalisisActividad(
  options: InyectarConfiguracionOptions
): void {
  inyectarReglasContrato({
    ...options,
    alcance:
      "clasificación (obligacion_detectada, tipo_actividad_detectada, proyecto_detectado, palabras_clave) y redacción (redaccion_ia, resumen_ia)",
  });
  inyectarContextoTecnicoClasificacion(options);
  inyectarEstiloRedaccion(options);
  inyectarEjemplosRedaccion(options);
}

/** Config IA para regenerar redacción (clasificación ya fijada). */
export function inyectarConfiguracionRegenerarRedaccion(
  options: InyectarConfiguracionOptions
): void {
  inyectarReglasContrato({
    ...options,
    alcance: "redaccion_ia y resumen_ia",
  });
  inyectarEstiloRedaccion(options);
  inyectarEjemplosRedaccion(options);
}
