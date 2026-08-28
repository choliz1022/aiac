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

function nombreMes(mes: number): string {
  return MESES_INFORME[mes - 1] ?? "mes";
}

function parsearFechaIso(fecha: string): { anio: number; mes: number; dia: number } | null {
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

/** "23 de enero de 2026" */
export function formatearFechaContratoSupervision(fecha: string | null | undefined): string {
  if (!fecha?.trim()) {
    return "________________";
  }

  const partes = parsearFechaIso(fecha.trim());

  if (!partes) {
    return fecha.trim();
  }

  return `${partes.dia} de ${nombreMes(partes.mes)} de ${partes.anio}`;
}

/** "01 al 30 de mayo de 2026" */
export function formatearPeriodoInformeSupervision(mes: number, anio: number): string {
  const ultimoDia = new Date(anio, mes, 0).getDate();

  return `01 al ${ultimoDia} de ${nombreMes(mes)} de ${anio}`;
}

/** Número de informe = mes con dos dígitos (05, 06, 07). */
export function formatearNumeroInformeSupervision(mes: number): string {
  return String(mes).padStart(2, "0");
}

/** Fecha de corte del informe: último día del periodo. */
export function formatearFechaCorteInformeSupervision(mes: number, anio: number): string {
  const ultimoDia = new Date(anio, mes, 0).getDate();

  return `${ultimoDia} de ${nombreMes(mes)} de ${anio}`;
}

/** Sufijo de fecha al final de cada actividad: "Del 08 al 28 de mayo de 2026." / "El 19 de mayo de 2026." */
export function formatearFechaActividadSupervision(etiqueta: string): string {
  const contenido = etiqueta.trim();

  if (!contenido) {
    return "";
  }

  if (contenido.startsWith("Del ")) {
    return contenido.endsWith(".") ? contenido : `${contenido}.`;
  }

  const normalizada = contenido.startsWith("El ") ? contenido.slice(3) : contenido;

  return normalizada.endsWith(".") ? `El ${normalizada}` : `El ${normalizada}.`;
}

export function formatearContratistaMayusculas(nombre: string | null | undefined): string {
  return (nombre?.trim() || "________________").toLocaleUpperCase("es-CO");
}

export function construirIntroduccionInformeSupervision(
  contratistaNombre: string | null | undefined,
  numeroContrato: string
): string {
  const contratista = formatearContratistaMayusculas(contratistaNombre);
  const contrato = numeroContrato.trim() || "________________";

  return `Por medio del presente informe se hace constar que se realizó Supervisión al contratista ${contratista}, sobre el cumplimiento de las actividades a su cargo, en el marco del contrato No. ${contrato}, de la siguiente manera:`;
}
