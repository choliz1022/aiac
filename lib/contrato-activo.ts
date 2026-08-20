import { supabase } from "@/lib/supabase";

export type ContratoActivoResumen = {
  id: string;
  nombre: string;
  entidad: string;
};

export async function getContratoActivoResumen(): Promise<ContratoActivoResumen | null> {
  try {
    const { data, error } = await supabase
      .from("contratos")
      .select("id, nombre, entidad")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error al consultar contrato activo:", error);
      return null;
    }

    if (!data?.nombre?.trim()) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error al consultar contrato activo:", error);
    return null;
  }
}

export function getPeriodoActual(): string {
  const ahora = new Date();

  return ahora.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
}
