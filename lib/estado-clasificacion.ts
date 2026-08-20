export type EstadoClasificacion = "correcta" | "revisar" | "sospechosa";

export type IndicadorClasificacion = {
  estado: EstadoClasificacion;
  emoji: string;
  etiqueta: string;
};

export function evaluarEstadoClasificacion(
  puntaje: number | null | undefined,
  clasificacionManual = false
): EstadoClasificacion {
  if (clasificacionManual) {
    return "correcta";
  }

  const puntajeNormalizado = puntaje ?? 0;

  if (puntajeNormalizado >= 70) {
    return "correcta";
  }

  if (puntajeNormalizado >= 40) {
    return "revisar";
  }

  return "sospechosa";
}

export function obtenerIndicadorClasificacion(
  puntaje: number | null | undefined,
  clasificacionManual = false
): IndicadorClasificacion {
  const estado = evaluarEstadoClasificacion(puntaje, clasificacionManual);

  if (clasificacionManual) {
    return {
      estado,
      emoji: "🟢",
      etiqueta: "Corregida manualmente",
    };
  }

  switch (estado) {
    case "correcta":
      return { estado, emoji: "🟢", etiqueta: "Correcta" };
    case "revisar":
      return { estado, emoji: "🟡", etiqueta: "Revisar" };
    case "sospechosa":
      return { estado, emoji: "🔴", etiqueta: "Sospechosa" };
  }
}
