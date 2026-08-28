import { EVIDENCIAS_MAX_BYTES } from "@/lib/evidencias";

export const OPTIMIZAR_IMAGEN_LADO_MAX = 1920;
export const OPTIMIZAR_IMAGEN_CALIDAD_JPEG = 0.8;

function generarNombreOptimizado(nombreOriginal: string): string {
  const base = nombreOriginal
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .slice(0, 120);

  const prefijo = base || "evidencia";
  const marca = Date.now().toString(36);

  return `${prefijo}-${marca}.jpg`;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo convertir la imagen a JPEG."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      calidad
    );
  });
}

/**
 * Redimensiona (lado mayor ≤ 1920 px), convierte a JPEG y optimiza en el navegador.
 * No conserva EXIF. Pensado para fotos de cámara móvil antes de subir a Storage.
 */
export async function optimizarImagenEvidencia(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) {
    throw new Error(`"${archivo.name}" no es una imagen válida.`);
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    throw new Error(`No se pudo leer "${archivo.name}".`);
  }

  try {
    const ladoMayor = Math.max(bitmap.width, bitmap.height);
    const escala =
      ladoMayor > OPTIMIZAR_IMAGEN_LADO_MAX
        ? OPTIMIZAR_IMAGEN_LADO_MAX / ladoMayor
        : 1;

    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error("El navegador no pudo preparar la optimización de la imagen.");
    }

    contexto.drawImage(bitmap, 0, 0, ancho, alto);

    let calidad = OPTIMIZAR_IMAGEN_CALIDAD_JPEG;
    let blob = await canvasToJpegBlob(canvas, calidad);

    while (blob.size > EVIDENCIAS_MAX_BYTES && calidad > 0.55) {
      calidad = Math.round((calidad - 0.05) * 100) / 100;
      blob = await canvasToJpegBlob(canvas, calidad);
    }

    if (blob.size > EVIDENCIAS_MAX_BYTES) {
      throw new Error(
        `"${archivo.name}" sigue siendo demasiado grande tras optimizar. Intenta con otra fotografía.`
      );
    }

    return new File([blob], generarNombreOptimizado(archivo.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export async function optimizarImagenesEvidencia(archivos: File[]): Promise<File[]> {
  const optimizados: File[] = [];

  for (const archivo of archivos) {
    optimizados.push(await optimizarImagenEvidencia(archivo));
  }

  return optimizados;
}
