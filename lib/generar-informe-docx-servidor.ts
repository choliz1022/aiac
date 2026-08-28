import "server-only";

import { Packer } from "docx";
import {
  construirDocumentoInformeMensual,
  construirNombreArchivoInforme,
} from "@/lib/exportar-informe-docx";
import { cargarImagenesEvidenciasParaDocx } from "@/lib/informe-docx-imagenes";
import { createClient } from "@/lib/supabase/server";
import type { InformeMensualData } from "@/types/informe-mensual";

function contarEvidenciasInforme(informe: InformeMensualData): number {
  return informe.obligaciones.reduce(
    (total, obligacion) =>
      total +
      obligacion.actividades.reduce(
        (subtotal, actividad) => subtotal + actividad.evidencias.length,
        0
      ),
    0
  );
}

export type ResultadoGeneracionDocx = {
  buffer: Buffer;
  filename: string;
  imagenesEmbebidas: number;
  imagenesOmitidas: number;
};

export async function generarBufferInformeDocx(
  informe: InformeMensualData
): Promise<ResultadoGeneracionDocx> {
  const supabase = await createClient();
  const imagenesPorId = await cargarImagenesEvidenciasParaDocx(supabase, informe);
  const documento = construirDocumentoInformeMensual(informe, imagenesPorId);
  const buffer = await Packer.toBuffer(documento);
  const totalEvidencias = contarEvidenciasInforme(informe);

  return {
    buffer,
    filename: construirNombreArchivoInforme(informe),
    imagenesEmbebidas: imagenesPorId.size,
    imagenesOmitidas: Math.max(0, totalEvidencias - imagenesPorId.size),
  };
}
