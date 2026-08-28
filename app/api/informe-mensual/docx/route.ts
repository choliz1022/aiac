import { NextResponse } from "next/server";
import { generarInformeMensual } from "@/app/(dashboard)/informe-mensual/actions";
import { generarBufferInformeDocx } from "@/lib/generar-informe-docx-servidor";

export const runtime = "nodejs";

type DocxRequestBody = {
  mes?: number;
  anio?: number;
  tipoInforme?: "contratista" | "supervision";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DocxRequestBody;
    const mes = body.mes;
    const anio = body.anio;

    if (typeof mes !== "number" || typeof anio !== "number") {
      return NextResponse.json(
        { error: "Debes indicar un mes y un año válidos." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio)) {
      return NextResponse.json(
        { error: "Debes indicar un mes y un año válidos." },
        { status: 400 }
      );
    }

    const tipoInforme = body.tipoInforme === "supervision" ? "supervision" : "contratista";

    const resultadoInforme = await generarInformeMensual({ mes, anio, tipoInforme });

    if (!resultadoInforme.success) {
      return NextResponse.json({ error: resultadoInforme.error }, { status: 400 });
    }

    if ("sinActividades" in resultadoInforme) {
      return NextResponse.json(
        { error: "No existen actividades registradas para este período." },
        { status: 400 }
      );
    }

    const { buffer, filename, imagenesEmbebidas, imagenesOmitidas } =
      await generarBufferInformeDocx(resultadoInforme.informe);

    if (imagenesEmbebidas === 0 && imagenesOmitidas > 0) {
      return NextResponse.json(
        {
          error:
            "No se pudieron incluir las evidencias en el DOCX. Verifica tu sesión e intenta de nuevo.",
        },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Filename": encodeURIComponent(filename),
        "X-Imagenes-Embedidas": String(imagenesEmbebidas),
        "X-Imagenes-Omitidas": String(imagenesOmitidas),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el informe en DOCX.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
