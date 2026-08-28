export type DefinicionFrenteContexto = {
  id: string;
  etiqueta: string;
  patrones: RegExp[];
};

function normalizarIdFrente(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function escaparPatronRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function crearPatronFrente(nombre: string): RegExp {
  const fragmento = escaparPatronRegex(nombre.trim())
    .replace(/\s+/g, "\\s+")
    .replace(/\\-/g, "-?");

  return new RegExp(`\\b${fragmento}\\b`, "i");
}

function parsearEntradaFrente(entrada: string): { nombre: string; aliases: string[] } {
  const aliasMatch = entrada.match(/^(.+?)\s*\(\s*alias(?:es)?\s*:\s*([^)]+)\)\s*$/i);

  if (aliasMatch) {
    return {
      nombre: aliasMatch[1].trim(),
      aliases: aliasMatch[2]
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
    };
  }

  return {
    nombre: entrada.trim(),
    aliases: [],
  };
}

function agregarFrente(
  frentes: DefinicionFrenteContexto[],
  vistos: Set<string>,
  entrada: string
): void {
  const { nombre, aliases } = parsearEntradaFrente(entrada);

  if (!nombre) {
    return;
  }

  const id = normalizarIdFrente(nombre);

  if (!id || vistos.has(id)) {
    return;
  }

  const patrones = [crearPatronFrente(nombre)];

  for (const alias of aliases) {
    patrones.push(crearPatronFrente(alias));
  }

  vistos.add(id);
  frentes.push({
    id,
    etiqueta: nombre,
    patrones,
  });
}

function parsearItemsInline(texto: string): string[] {
  return texto
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function esInicioNuevaSeccion(linea: string): boolean {
  return /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ0-9][^:]*:\s*$/.test(linea);
}

/**
 * Extrae frentes de trabajo declarados en contexto_tecnico (Configuración IA).
 * Soporta listas inline y viñetas tras "Frentes:" / "Frente:".
 */
export function parsearFrentesContextoTecnico(contextoTecnico: string): DefinicionFrenteContexto[] {
  const frentes: DefinicionFrenteContexto[] = [];
  const vistos = new Set<string>();

  if (!contextoTecnico.trim()) {
    return frentes;
  }

  const lineas = contextoTecnico.split(/\r?\n/);
  let enSeccionFrentes = false;

  for (const linea of lineas) {
    const trimmed = linea.trim();

    const matchInline = trimmed.match(/^frentes?\s*:\s*(.*)$/i);

    if (matchInline) {
      const resto = matchInline[1].trim();

      if (resto) {
        for (const item of parsearItemsInline(resto)) {
          agregarFrente(frentes, vistos, item);
        }
        enSeccionFrentes = false;
      } else {
        enSeccionFrentes = true;
      }

      continue;
    }

    if (!enSeccionFrentes) {
      continue;
    }

    if (!trimmed) {
      enSeccionFrentes = false;
      continue;
    }

    if (esInicioNuevaSeccion(trimmed)) {
      enSeccionFrentes = false;
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);

    if (bullet) {
      agregarFrente(frentes, vistos, bullet[1]);
      continue;
    }

    enSeccionFrentes = false;
  }

  return frentes.sort((a, b) => b.etiqueta.length - a.etiqueta.length);
}
