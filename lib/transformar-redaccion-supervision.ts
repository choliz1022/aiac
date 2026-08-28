const TRANSFORMACIONES_VERBO_SUPERVISION: Record<string, string> = {
  Apoyé: "Apoyó",
  apoyé: "apoyó",
  Guardé: "Guardó",
  guardé: "guardó",
  Realicé: "Realizó",
  realicé: "realizó",
};

/**
 * Convierte solo el verbo inicial permitido a tercera persona.
 * Apoyé → Apoyó, Guardé → Guardó, Realicé → Realizó. Nada más.
 */
export function transformarRedaccionSupervision(texto: string): string {
  const contenido = texto.trim();

  if (!contenido) {
    return texto;
  }

  const coincidencia = contenido.match(/^(\s*)(\S+)([\s\S]*)$/);

  if (!coincidencia) {
    return texto;
  }

  const [, espacioInicial, primeraPalabra, resto] = coincidencia;
  const palabraTransformada =
    TRANSFORMACIONES_VERBO_SUPERVISION[primeraPalabra] ?? primeraPalabra;

  return `${espacioInicial ?? ""}${palabraTransformada}${resto ?? ""}`;
}
