import {
  AlignmentType,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from "docx";
import { MENSAJE_OBLIGACION_SIN_ACTIVIDADES } from "@/lib/informe-mensual";
import type { InformeMensualData } from "@/types/informe-mensual";

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

const REFERENCIA_VIÑETAS = "informe-vinetas";

const TEXTO_GENERADO_POR_AIAC =
  "Generado por AIAC a partir de las actividades registradas para el periodo.";

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

function parrafoViñeta(texto: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    numbering: {
      reference: REFERENCIA_VIÑETAS,
      level: 0,
    },
    children: [new TextRun({ text: texto })],
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

function construirSeccionObservaciones(informe: InformeMensualData): Paragraph[] {
  const observaciones = informe.observacionesFinales?.trim();
  const parrafos: Paragraph[] = [
    new Paragraph({
      spacing: { before: 360, after: 160 },
      children: [new TextRun({ text: "Observaciones", bold: true, size: 26 })],
    }),
  ];

  if (observaciones) {
    parrafos.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: observaciones })],
      })
    );
  }

  parrafos.push(
    new Paragraph({
      spacing: { before: observaciones ? 120 : 0, after: 120 },
      children: [
        new TextRun({
          text: TEXTO_GENERADO_POR_AIAC,
          italics: true,
          color: "666666",
        }),
      ],
    })
  );

  return parrafos;
}

export function construirDocumentoInformeMensual(informe: InformeMensualData): Document {
  const children: Paragraph[] = [
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
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: "Resumen del periodo:", bold: true })],
    }),
    parrafoViñeta(
      `Actividades registradas: ${informe.resumen.totalActividades}`
    ),
    parrafoViñeta(
      `Obligaciones con actividad: ${informe.resumen.totalObligacionesTrabajadas}`
    ),
  ];

  informe.obligaciones.forEach((obligacion, index) => {
    children.push(
      new Paragraph({
        spacing: { before: 360, after: 120 },
        children: [
          new TextRun({
            text: `Obligación ${index + 1}`,
            bold: true,
            size: 26,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: obligacion.nombre, bold: true })],
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

    for (const actividad of obligacion.actividadesConsolidadas) {
      children.push(parrafoViñeta(actividad.redaccion_consolidada));
    }
  });

  children.push(...construirSeccionObservaciones(informe));

  return new Document({
    numbering: {
      config: [
        {
          reference: REFERENCIA_VIÑETAS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
          ],
        },
      ],
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
