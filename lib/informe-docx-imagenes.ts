import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { EVIDENCIAS_BUCKET } from "@/lib/evidencias";
import {
  detectarTipoImagen,
  escalarImagen,
  type ImagenEvidenciaDocx,
  MAX_ALTO_EVIDENCIA_PX,
  MAX_ANCHO_EVIDENCIA_PX,
  type TipoImagenDocx,
} from "@/lib/exportar-informe-docx";
import type { InformeMensualData, InformeMensualEvidencia } from "@/types/informe-mensual";

function leerDimensionesPng(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 24 || data[0] !== 0x89 || data[1] !== 0x50) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function leerDimensionesGif(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 10) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    width: view.getUint16(6, true),
    height: view.getUint16(8, true),
  };
}

function leerDimensionesJpeg(data: Uint8Array): { width: number; height: number } | null {
  let offset = 2;

  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      break;
    }

    const marker = data[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const view = new DataView(data.buffer, data.byteOffset + offset + 5, 4);
      return {
        height: view.getUint16(0),
        width: view.getUint16(2),
      };
    }

    const segmentLength = (data[offset + 2] << 8) + data[offset + 3];
    if (segmentLength < 2) {
      break;
    }

    offset += segmentLength + 2;
  }

  return null;
}

function leerDimensionesBmp(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 26) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    width: Math.abs(view.getInt32(18, true)),
    height: Math.abs(view.getInt32(22, true)),
  };
}

function leerDimensionesImagen(
  data: Uint8Array,
  tipo: TipoImagenDocx
): { width: number; height: number } | null {
  switch (tipo) {
    case "png":
      return leerDimensionesPng(data);
    case "gif":
      return leerDimensionesGif(data);
    case "jpg":
      return leerDimensionesJpeg(data);
    case "bmp":
      return leerDimensionesBmp(data);
    default:
      return null;
  }
}

async function convertirWebpAPng(data: Uint8Array): Promise<Uint8Array> {
  const sharp = (await import("sharp")).default;
  const pngBuffer = await sharp(Buffer.from(data)).png().toBuffer();
  return new Uint8Array(pngBuffer);
}

async function prepararBytesImagen(
  data: Uint8Array,
  tipoDetectado: TipoImagenDocx | "webp"
): Promise<{ data: Uint8Array; type: TipoImagenDocx } | null> {
  if (tipoDetectado === "webp") {
    try {
      const png = await convertirWebpAPng(data);
      return { data: png, type: "png" };
    } catch {
      return null;
    }
  }

  return { data, type: tipoDetectado };
}

async function obtenerBytesEvidencia(
  supabase: SupabaseClient,
  evidencia: InformeMensualEvidencia
): Promise<{ bytes: Uint8Array; contentType?: string } | null> {
  if (evidencia.url) {
    const { data: blob, error } = await supabase.storage
      .from(EVIDENCIAS_BUCKET)
      .download(evidencia.url);

    if (!error && blob) {
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        contentType: blob.type || undefined,
      };
    }
  }

  if (evidencia.signed_url) {
    try {
      const respuesta = await fetch(evidencia.signed_url);
      if (respuesta.ok) {
        return {
          bytes: new Uint8Array(await respuesta.arrayBuffer()),
          contentType: respuesta.headers.get("content-type")?.split(";")[0].trim() || undefined,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function descargarImagenEvidencia(
  supabase: SupabaseClient,
  evidencia: InformeMensualEvidencia
): Promise<ImagenEvidenciaDocx | null> {
  try {
    const descarga = await obtenerBytesEvidencia(supabase, evidencia);
    if (!descarga) {
      return null;
    }

    const tipoDetectado = detectarTipoImagen(
      descarga.bytes,
      descarga.contentType,
      evidencia.nombre_archivo
    );

    if (!tipoDetectado) {
      return null;
    }

    const preparada = await prepararBytesImagen(descarga.bytes, tipoDetectado);
    if (!preparada) {
      return null;
    }

    const dimensiones =
      leerDimensionesImagen(preparada.data, preparada.type) ??
      ({ width: MAX_ANCHO_EVIDENCIA_PX, height: MAX_ALTO_EVIDENCIA_PX } as const);

    const transformacion = escalarImagen(
      dimensiones.width,
      dimensiones.height,
      MAX_ANCHO_EVIDENCIA_PX,
      MAX_ALTO_EVIDENCIA_PX
    );

    return {
      data: preparada.data,
      type: preparada.type,
      width: transformacion.width,
      height: transformacion.height,
    };
  } catch {
    return null;
  }
}

export async function cargarImagenesEvidenciasParaDocx(
  supabase: SupabaseClient,
  informe: InformeMensualData
): Promise<Map<string, ImagenEvidenciaDocx>> {
  const evidencias: InformeMensualEvidencia[] = [];

  for (const obligacion of informe.obligaciones) {
    for (const actividad of obligacion.actividades) {
      evidencias.push(...actividad.evidencias);
    }
  }

  const resultados = await Promise.all(
    evidencias.map(async (evidencia) => {
      const imagen = await descargarImagenEvidencia(supabase, evidencia);
      return imagen ? ([evidencia.id, imagen] as const) : null;
    })
  );

  return new Map(resultados.filter((resultado) => resultado !== null));
}
