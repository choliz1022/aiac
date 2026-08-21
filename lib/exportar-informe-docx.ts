import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "docx";
import { MENSAJE_OBLIGACION_SIN_ACTIVIDADES } from "@/lib/informe-mensual";
import type { InformeMensualData, InformeMensualObligacion } from "@/types/informe-mensual";

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

function parrafoEtiqueta(etiqueta: string, valor: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${etiqueta}: `, bold: true }),
      new TextRun({ text: valor }),
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

function celdaTexto(texto: string): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: texto })],
      }),
    ],
  });
}

function celdaEvidencias(nombresArchivo: string[]): TableCell {
  const parrafos =
    nombresArchivo.length === 0
      ? [new Paragraph({ children: [new TextRun({ text: "" })] })]
      : nombresArchivo.map(
          (nombre) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: nombre, italics: true, color: "666666" })],
            })
        );

  return new TableCell({
    verticalAlign: VerticalAlign.TOP,
    children: parrafos,
  });
}

function construirTablaObligacion(obligacion: InformeMensualObligacion): Table {
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
          celdaTexto(actividad.redaccion_ia),
          celdaEvidencias(actividad.evidencias.map((evidencia) => evidencia.nombre_archivo)),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: filas,
  });
}

export function construirDocumentoInformeMensual(informe: InformeMensualData): Document {
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
        spacing: { after: 160 },
        children: [new TextRun({ text: obligacion.nombre })],
      })
    );

    if (obligacion.mensajeSinActividades) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: MENSAJE_OBLIGACION_SIN_ACTIVIDADES,
              italics: true,
            }),
          ],
        })
      );
      return;
    }

    children.push(construirTablaObligacion(obligacion));
  });

  return new Document({
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

export async function exportarInformeMensualDocx(informe: InformeMensualData): Promise<void> {
  const documento = construirDocumentoInformeMensual(informe);
  const blob = await Packer.toBlob(documento);
  const nombreArchivo = construirNombreArchivoInforme(informe);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();

  URL.revokeObjectURL(url);
}
