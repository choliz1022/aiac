import {
  AlignmentType,
  Document,
  ImageRun,
  LineRuleType,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "docx";
import type { IRunOptions, ISpacingProperties } from "docx";
import { MENSAJE_OBLIGACION_SIN_ACTIVIDADES } from "@/lib/informe-mensual";
import type {
  InformeMensualData,
  InformeMensualEvidencia,
  InformeMensualActividadFila,
  InformeMensualObligacion,
} from "@/types/informe-mensual";

const MESES_ARCHIVO = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const NOMBRES_RESERVADOS_WINDOWS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "lpt1",
  "lpt2",
  "lpt3",
]);

/** Tamaño máximo de miniatura en columna EVIDENCIAS (proporción conservada). */
export const MAX_ANCHO_EVIDENCIA_PX = 150;
export const MAX_ALTO_EVIDENCIA_PX = 150;

const FUENTE_INFORME = "Calibri";
/** 11 pt expresado en half-points (unidad de Word). */
const TAMANO_CUERPO_HALF_POINTS = 22;
/** Interlineado 1.15 (276 = 1.15 × 240 twips de línea base). */
const INTERLINEADO_CUERPO: Pick<ISpacingProperties, "line" | "lineRule"> = {
  line: 276,
  lineRule: LineRuleType.AUTO,
};

function textoCuerpo(options: IRunOptions): TextRun {
  return new TextRun({
    font: FUENTE_INFORME,
    size: TAMANO_CUERPO_HALF_POINTS,
    ...options,
  });
}

function espaciadoParrafoCuerpo(
  extra: Pick<ISpacingProperties, "before" | "after"> = {}
): ISpacingProperties {
  return {
    ...INTERLINEADO_CUERPO,
    ...extra,
  };
}

export type TipoImagenDocx = "jpg" | "png" | "gif" | "bmp";

export type ImagenEvidenciaDocx = {
  data: Uint8Array;
  type: TipoImagenDocx;
  width: number;
  height: number;
};

function parrafoEtiqueta(etiqueta: string, valor: string): Paragraph {
  return new Paragraph({
    spacing: espaciadoParrafoCuerpo({ after: 120 }),
    children: [
      textoCuerpo({ text: `${etiqueta}: `, bold: true }),
      textoCuerpo({ text: valor }),
    ],
  });
}

function sanitizarSegmentoArchivo(
  texto: string,
  fallback: string,
  maxLength = 60
): string {
  let normalizado = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLength);

  if (!normalizado || NOMBRES_RESERVADOS_WINDOWS.has(normalizado.toLowerCase())) {
    normalizado = fallback;
  }

  return normalizado;
}

export function sanitizarNombreArchivoInforme(nombreArchivo: string): string {
  const extension = ".docx";
  const base = nombreArchivo.toLowerCase().endsWith(extension)
    ? nombreArchivo.slice(0, -extension.length)
    : nombreArchivo;

  const segmentos = base.split("_").filter(Boolean);
  const segmentosSanitizados = segmentos.map((segmento, index) => {
    const fallback =
      index === 0 ? "Contrato" : index === 2 ? "Mes" : index === 3 ? "0000" : "Informe";

    return sanitizarSegmentoArchivo(segmento, fallback, index === 0 ? 40 : 20);
  });

  const nombreBase =
    segmentosSanitizados.length >= 4
      ? `${segmentosSanitizados[0]}_Informe_${segmentosSanitizados[2]}_${segmentosSanitizados[3]}`
      : sanitizarSegmentoArchivo(base, "Informe_Contrato", 80);

  return `${nombreBase}${extension}`;
}

export function construirNombreArchivoInforme(informe: InformeMensualData): string {
  const mes = MESES_ARCHIVO[informe.periodo.mes - 1] ?? "Mes";
  const contrato = sanitizarSegmentoArchivo(informe.contrato.nombre, "Contrato", 40);
  const mesSanitizado = sanitizarSegmentoArchivo(mes, "Mes", 20);
  const anio = sanitizarSegmentoArchivo(String(informe.periodo.anio), "0000", 4);

  return sanitizarNombreArchivoInforme(`${contrato}_Informe_${mesSanitizado}_${anio}.docx`);
}

export function extensionATipoImagen(extension: string): TipoImagenDocx | "webp" | null {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "jpg";
    case "png":
      return "png";
    case "gif":
      return "gif";
    case "bmp":
      return "bmp";
    case "webp":
      return "webp";
    default:
      return null;
  }
}

export function mimeATipoImagen(mime: string): TipoImagenDocx | "webp" | null {
  switch (mime.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function detectarTipoPorFirma(bytes: Uint8Array): TipoImagenDocx | "webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "gif";
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "bmp";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export function detectarTipoImagen(
  bytes: Uint8Array,
  contentType?: string,
  nombreArchivo?: string
): TipoImagenDocx | "webp" | null {
  if (contentType) {
    const desdeMime = mimeATipoImagen(contentType);
    if (desdeMime) {
      return desdeMime;
    }
  }

  if (nombreArchivo?.includes(".")) {
    const extension = nombreArchivo.split(".").pop() ?? "";
    const desdeExtension = extensionATipoImagen(extension);
    if (desdeExtension) {
      return desdeExtension;
    }
  }

  return detectarTipoPorFirma(bytes);
}

export function escalarImagen(
  anchoNatural: number,
  altoNatural: number,
  maxAncho: number,
  maxAlto: number
): { width: number; height: number } {
  if (anchoNatural <= 0 || altoNatural <= 0) {
    return { width: maxAncho, height: maxAlto };
  }

  const factor = Math.min(maxAncho / anchoNatural, maxAlto / altoNatural, 1);

  return {
    width: Math.max(1, Math.round(anchoNatural * factor)),
    height: Math.max(1, Math.round(altoNatural * factor)),
  };
}

function celdaEncabezadoTabla(texto: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: "F4F4F5" },
    children: [
      new Paragraph({
        children: [new TextRun({ text: texto, bold: true, size: 20 })],
      }),
    ],
  });
}

function obtenerRedaccionesActividad(actividad: InformeMensualActividadFila): string[] {
  return actividad.redacciones_ia ?? [actividad.redaccion_ia];
}

function celdaActividad(actividad: InformeMensualActividadFila): TableCell {
  const parrafos: Paragraph[] = [];

  for (const redaccion of obtenerRedaccionesActividad(actividad)) {
    parrafos.push(
      new Paragraph({
        spacing: espaciadoParrafoCuerpo({ after: 80 }),
        children: [textoCuerpo({ text: redaccion })],
      })
    );
  }

  parrafos.push(
    new Paragraph({
      spacing: espaciadoParrafoCuerpo({ after: 80 }),
      children: [
        textoCuerpo({
          text: actividad.fecha_ejecucion_etiqueta,
          color: "666666",
        }),
      ],
    })
  );

  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    children: parrafos,
  });
}

function celdaEvidenciasVacias(): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({})],
  });
}

function celdaEvidencias(
  evidencias: InformeMensualEvidencia[],
  imagenesPorId: Map<string, ImagenEvidenciaDocx>
): TableCell {
  if (evidencias.length === 0) {
    return celdaEvidenciasVacias();
  }

  const parrafos: Paragraph[] = [];

  for (const evidencia of evidencias) {
    const imagen = imagenesPorId.get(evidencia.id);
    if (!imagen) {
      continue;
    }

    parrafos.push(
      new Paragraph({
        spacing: espaciadoParrafoCuerpo({ after: 120 }),
        children: [
          new ImageRun({
            type: imagen.type,
            data: imagen.data,
            transformation: {
              width: imagen.width,
              height: imagen.height,
            },
            altText: {
              name: "Evidencia fotográfica",
              description: evidencia.nombre_archivo,
            },
          }),
        ],
      })
    );
  }

  if (parrafos.length === 0) {
    return celdaEvidenciasVacias();
  }

  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    children: parrafos,
  });
}

function construirTablaObligacion(
  obligacion: InformeMensualObligacion,
  imagenesPorId: Map<string, ImagenEvidenciaDocx>
): Table {
  const filas: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        celdaEncabezadoTabla("ACTIVIDADES REALIZADAS"),
        celdaEncabezadoTabla("EVIDENCIAS"),
      ],
    }),
  ];

  for (const actividad of obligacion.actividades) {
    filas.push(
      new TableRow({
        children: [
          celdaActividad(actividad),
          celdaEvidencias(actividad.evidencias, imagenesPorId),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: filas,
  });
}

export function construirDocumentoInformeMensual(
  informe: InformeMensualData,
  imagenesPorId: Map<string, ImagenEvidenciaDocx>
): Document {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: "INFORME MENSUAL DE ACTIVIDADES",
          bold: true,
          size: 32,
        }),
      ],
    }),
    parrafoEtiqueta("Contrato", informe.contrato.nombre),
    parrafoEtiqueta("Entidad", informe.contrato.entidad),
    parrafoEtiqueta("Periodo", informe.periodo.etiqueta),
    parrafoEtiqueta("Objeto contractual", informe.contrato.objeto_contractual),
  ];

  informe.obligaciones.forEach((obligacion) => {
    children.push(
      new Paragraph({
        spacing: { before: 360, after: 120 },
        children: [
          new TextRun({
            text: "OBLIGACIÓN CONTRACTUAL",
            bold: true,
            size: 22,
            color: "666666",
          }),
        ],
      }),
      new Paragraph({
        spacing: espaciadoParrafoCuerpo({ after: 160 }),
        children: [textoCuerpo({ text: obligacion.nombre })],
      })
    );

    if (obligacion.mensajeSinActividades) {
      children.push(
        new Paragraph({
          spacing: espaciadoParrafoCuerpo({ after: 120 }),
          children: [
            textoCuerpo({
              text: MENSAJE_OBLIGACION_SIN_ACTIVIDADES,
              italics: true,
            }),
          ],
        })
      );
      return;
    }

    children.push(construirTablaObligacion(obligacion, imagenesPorId));
  });

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FUENTE_INFORME,
            size: TAMANO_CUERPO_HALF_POINTS,
          },
          paragraph: {
            spacing: INTERLINEADO_CUERPO,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });
}
