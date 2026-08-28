const MESES_INFORME = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

type PartesFecha = {
  anio: number;
  mes: number;
  dia: number;
};

function parsearFechaIso(fecha: string): PartesFecha | null {
  const [anioTexto, mesTexto, diaTexto] = fecha.split("-");

  if (!anioTexto || !mesTexto || !diaTexto) {
    return null;
  }

  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  if (
    !Number.isInteger(anio) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia) ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31
  ) {
    return null;
  }

  return { anio, mes, dia };
}

function ordenarFechasIso(fechas: string[]): string[] {
  return [...new Set(fechas)].sort((a, b) => a.localeCompare(b));
}

function fechasSonConsecutivas(fechas: string[]): boolean {
  if (fechas.length <= 1) {
    return true;
  }

  for (let indice = 1; indice < fechas.length; indice += 1) {
    const anterior = parsearFechaIso(fechas[indice - 1]);
    const actual = parsearFechaIso(fechas[indice]);

    if (!anterior || !actual) {
      return false;
    }

    const fechaAnterior = new Date(anterior.anio, anterior.mes - 1, anterior.dia);
    const fechaActual = new Date(actual.anio, actual.mes - 1, actual.dia);
    const diferenciaDias =
      (fechaActual.getTime() - fechaAnterior.getTime()) / (1000 * 60 * 60 * 24);

    if (diferenciaDias !== 1) {
      return false;
    }
  }

  return true;
}

function nombreMes(mes: number): string {
  return MESES_INFORME[mes - 1] ?? "mes";
}

/** Formato contractual: "15 de junio de 2026". */
export function formatearFechaEjecucion(fecha: string): string {
  const partes = parsearFechaIso(fecha);

  if (!partes) {
    return fecha;
  }

  return `${partes.dia} de ${nombreMes(partes.mes)} de ${partes.anio}`;
}

function formatearDiasYMes(dias: number[], mes: number, anio: number): string {
  const mesTexto = nombreMes(mes);

  if (dias.length === 1) {
    return `${dias[0]} de ${mesTexto} de ${anio}`;
  }

  if (dias.length === 2) {
    return `${dias[0]} y ${dias[1]} de ${mesTexto} de ${anio}`;
  }

  const ultimoDia = dias[dias.length - 1];
  const diasIniciales = dias.slice(0, -1).join(", ");

  return `${diasIniciales} y ${ultimoDia} de ${mesTexto} de ${anio}`;
}

/**
 * Consolida fechas de actividades equivalentes.
 * - Una fecha → "15 de junio de 2026"
 * - Consecutivas mismo mes → "Del 15 al 25 de junio de 2026"
 * - No consecutivas mismo mes → "15 y 27 de junio de 2026"
 */
export function consolidarFechasEjecucion(fechas: string[]): string {
  const fechasOrdenadas = ordenarFechasIso(fechas);

  if (fechasOrdenadas.length === 0) {
    return "";
  }

  if (fechasOrdenadas.length === 1) {
    return formatearFechaEjecucion(fechasOrdenadas[0]);
  }

  const partes = fechasOrdenadas
    .map(parsearFechaIso)
    .filter((parte): parte is PartesFecha => Boolean(parte));

  if (partes.length !== fechasOrdenadas.length) {
    return fechasOrdenadas.map(formatearFechaEjecucion).join("; ");
  }

  const mismoMesAnio = partes.every(
    (parte) => parte.mes === partes[0].mes && parte.anio === partes[0].anio
  );

  if (!mismoMesAnio) {
    return fechasOrdenadas.map(formatearFechaEjecucion).join("; ");
  }

  const dias = partes.map((parte) => parte.dia);
  const mes = partes[0].mes;
  const anio = partes[0].anio;

  if (dias.length === 2 && !fechasSonConsecutivas(fechasOrdenadas)) {
    return `${dias[0]} y ${dias[1]} de ${nombreMes(mes)} de ${anio}`;
  }

  if (fechasSonConsecutivas(fechasOrdenadas) || dias.length >= 3) {
    return `Del ${dias[0]} al ${dias[dias.length - 1]} de ${nombreMes(mes)} de ${anio}`;
  }

  return formatearDiasYMes(dias, mes, anio);
}
