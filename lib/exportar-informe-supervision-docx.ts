import {
  AlignmentType,
  Document,
  LineRuleType,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from "docx";
import type { ISpacingProperties } from "docx";
import { MENSAJE_OBLIGACION_SIN_ACTIVIDADES } from "@/lib/informe-mensual";
import {
  construirEncabezadoInformeSupervision,
  obtenerFechaActividadSupervision,
  obtenerRedaccionesActividadSupervision,
} from "@/lib/informe-supervision";
import type { InformeMensualData } from "@/types/informe-mensual";

const FUENTE_INFORME = "Calibri";
const TAMANO_CUERPO_HALF_POINTS = 22;
const INTERLINEADO_CUERPO: Pick<ISpacingProperties, "line" | "lineRule"> = {
  line: 276,
  lineRule: LineRuleType.AUTO,
};

function textoCuerpo(options: {
  text: string;
  bold?: boolean;
  italics?: boolean;
  color?: string;
}): TextRun {
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

function parrafoCampo(etiqueta: string, valor: string): Paragraph {
  return new Paragraph({
    spacing: espaciadoParrafoCuerpo({ after: 80 }),
    children: [
      textoCuerpo({ text: `${etiqueta}: `, bold: true }),
      textoCuerpo({ text: valor }),
    ],
  });
}

function parrafoTexto(texto: string, extra: Pick<ISpacingProperties, "before" | "after"> = {}): Paragraph {
  return new Paragraph({
    spacing: espaciadoParrafoCuerpo(extra),
    children: [textoCuerpo({ text: texto })],
  });
}

function parrafoTituloSeccion(texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: TAMANO_CUERPO_HALF_POINTS,
        font: FUENTE_INFORME,
      }),
    ],
  });
}

export function construirDocumentoInformeSupervision(informe: InformeMensualData): Document {
  const encabezado = construirEncabezadoInformeSupervision(informe);
  const supervisorNombre = informe.contrato.supervisor_nombre?.trim() || "________________";
  const supervisorCargo = informe.contrato.supervisor_cargo?.trim();

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `INFORME DE SUPERVISIÓN No. ${encabezado.numeroInforme}`,
          bold: true,
          size: 28,
          font: FUENTE_INFORME,
        }),
      ],
    }),
    parrafoCampo("CONTRATO No.", encabezado.numeroContrato),
    parrafoCampo("CONTRATISTA", encabezado.contratista),
    parrafoCampo("INICIO CONTRATO", encabezado.inicioContrato),
    parrafoCampo("FIN CONTRATO", encabezado.finContrato),
    parrafoCampo("PERIODO DEL INFORME", encabezado.periodoInforme),
    parrafoCampo("FECHA", encabezado.fechaInforme),
    parrafoTituloSeccion("OBJETO DEL CONTRATO:"),
    new Paragraph({
      spacing: espaciadoParrafoCuerpo({ after: 160 }),
      children: [
        textoCuerpo({ text: "OBJETO: ", bold: true }),
        textoCuerpo({ text: encabezado.objetoContractual }),
      ],
    }),
    parrafoTexto(encabezado.introduccion, { after: 160 }),
    parrafoTituloSeccion("ASPECTOS SUPERVISADOS"),
  ];

  informe.obligaciones.forEach((obligacion, index) => {
    children.push(
      parrafoTituloSeccion(`Obligación ${index + 1}`),
      parrafoTexto(obligacion.nombre, { after: 120 })
    );

    if (obligacion.mensajeSinActividades) {
      children.push(parrafoTexto(MENSAJE_OBLIGACION_SIN_ACTIVIDADES, { after: 120 }));
      return;
    }

    for (const actividad of obligacion.actividades) {
      for (const redaccion of obtenerRedaccionesActividadSupervision(actividad)) {
        children.push(parrafoTexto(redaccion, { after: 120 }));
      }

      const fecha = obtenerFechaActividadSupervision(actividad);

      if (fecha) {
        children.push(parrafoTexto(fecha, { after: 120 }));
      }
    }
  });

  children.push(
    new Paragraph({
      spacing: { before: 720, after: 120 },
      alignment: AlignmentType.CENTER,
      children: [textoCuerpo({ text: supervisorNombre, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: espaciadoParrafoCuerpo({ after: 80 }),
      children: [textoCuerpo({ text: "Supervisor" })],
    })
  );

  if (supervisorCargo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: espaciadoParrafoCuerpo({ after: 80 }),
        children: [textoCuerpo({ text: supervisorCargo })],
      })
    );
  }

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
