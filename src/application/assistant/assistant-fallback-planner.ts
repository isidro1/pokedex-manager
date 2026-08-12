import type { MCPToolName } from "@/infrastructure/mcp/mcp-server";

type AssistantToolCall = {
  toolName: MCPToolName;
  args: Record<string, unknown>;
};

export type AssistantFallbackPlan = {
  assistantMessage: string;
  toolCalls: AssistantToolCall[];
};

const POKEMON_TYPE_ALIASES: Record<string, string> = {
  normal: "normal",
  fuego: "fire",
  fire: "fire",
  agua: "water",
  water: "water",
  planta: "grass",
  hierba: "grass",
  grass: "grass",
  electrico: "electric",
  electric: "electric",
  hielo: "ice",
  ice: "ice",
  lucha: "fighting",
  fighting: "fighting",
  veneno: "poison",
  poison: "poison",
  tierra: "ground",
  ground: "ground",
  volador: "flying",
  flying: "flying",
  psiquico: "psychic",
  psychic: "psychic",
  bicho: "bug",
  bug: "bug",
  roca: "rock",
  rock: "rock",
  fantasma: "ghost",
  ghost: "ghost",
  dragon: "dragon",
  siniestro: "dark",
  dark: "dark",
  acero: "steel",
  steel: "steel",
  hada: "fairy",
  fairy: "fairy",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractPokemonCandidate(userMessage: string): string | null {
  const trimmed = userMessage.trim();
  const normalized = normalizeText(trimmed);

  const whoIsMatch = normalized.match(
    /\b(?:quien es|que es|que pokemon es|dime de|que sabes de)\s+([a-z0-9-\s]{2,})$/i,
  );
  if (whoIsMatch?.[1]) {
    return whoIsMatch[1].trim().replace(/\s+/g, "-");
  }

  const quotedMatch = trimmed.match(/["']([a-z0-9-\s]{2,})["']/i);

  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim().replace(/\s+/g, "-");
  }

  const idMatch = trimmed.match(/#?(\d{1,4})\b/);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  const tokenMatch = trimmed.match(/\b([a-z][a-z0-9-]{2,})\b/gi);
  if (!tokenMatch || tokenMatch.length === 0) {
    return null;
  }

  const blacklist = new Set([
    "quien",
    "quienes",
    "que",
    "es",
    "de",
    "sabes",
    "dime",
    "sobre",
    "del",
    "la",
    "el",
    "los",
    "las",
    "un",
    "una",
    "por",
    "favor",
    "quiero",
    "agrega",
    "agregar",
    "agregalo",
    "anade",
    "añade",
    "elimina",
    "eliminar",
    "quita",
    "borra",
    "buscar",
    "busca",
    "pokemon",
    "pokemones",
    "coleccion",
    "colecciona",
    "recomienda",
    "recomendacion",
    "muestrame",
    "muestra",
    "mostrar",
    "ver",
    "ensename",
    "quiero-ver",
    "quieres",
    "herramientas",
    "capacidades",
    "comandos",
    "tools",
  ]);

  for (const typeAlias of Object.keys(POKEMON_TYPE_ALIASES)) {
    blacklist.add(typeAlias);
  }

  for (const typeName of Object.values(POKEMON_TYPE_ALIASES)) {
    blacklist.add(typeName);
  }

  for (const token of tokenMatch) {
    const normalized = normalizeText(token);
    if (!blacklist.has(normalized)) {
      return normalized;
    }
  }

  return null;
}

function extractPokemonTypeCandidate(userMessage: string): string | null {
  const normalized = normalizeText(userMessage);

  const explicitMatches = [
    normalized.match(/\b(?:pokemon|pokemones)\s+de\s+tipo\s+([a-z-]{3,})\b/),
    normalized.match(/\b(?:pokemon|pokemones)\s+de\s+([a-z-]{3,})\b/),
    normalized.match(/\btipo\s+([a-z-]{3,})\b/),
  ];

  for (const match of explicitMatches) {
    const rawType = match?.[1];
    if (!rawType) {
      continue;
    }

    return POKEMON_TYPE_ALIASES[rawType] ?? rawType;
  }

  if (!/\b(pokemon|pokemones|tipo)\b/.test(normalized)) {
    return null;
  }

  const tokens = normalized.match(/\b[a-z-]{3,}\b/g) ?? [];
  for (const token of tokens) {
    if (POKEMON_TYPE_ALIASES[token]) {
      return POKEMON_TYPE_ALIASES[token];
    }
  }

  return null;
}

function extractLoosePokemonTypeCandidate(normalizedMessage: string): string | null {
  const tokens = normalizedMessage.match(/\b[a-z-]{3,}\b/g) ?? [];

  for (const token of tokens) {
    if (POKEMON_TYPE_ALIASES[token]) {
      return POKEMON_TYPE_ALIASES[token];
    }
  }

  return null;
}

export function buildFallbackAssistantPlan(userMessage: string): AssistantFallbackPlan {
  const normalized = normalizeText(userMessage);
  const pokemonCandidate = extractPokemonCandidate(userMessage);
  const pokemonTypeCandidate = extractPokemonTypeCandidate(userMessage);

  if (/^(hola|buenas|hello|hi|hey)\b|\b(buenos dias|buenas tardes|buenas noches)\b/.test(normalized)) {
    return {
      assistantMessage:
        "Hola. Soy tu asistente de coleccion Pokemon. Puedes pedirme: 'muestra mi coleccion', 'estadisticas', 'recomiendame', 'agrega pikachu' o 'elimina bulbasaur'.",
      toolCalls: [],
    };
  }

  if (
    /\b(quien es|que es|que pokemon es|info de|informacion de|dime de|que sabes de)\b/.test(
      normalized,
    ) &&
    pokemonCandidate
  ) {
    return {
      assistantMessage: "Te comparto informacion objetiva del Pokemon solicitado.",
      toolCalls: [{ toolName: "get_pokemon", args: { pokemon: pokemonCandidate } }],
    };
  }

  if (
    /\b(muestrame|muestra|ensename|quiero ver|ver)\b/.test(normalized) &&
    /\b(a\s+)?([a-z0-9-]{2,})\b/.test(normalized) &&
    pokemonCandidate &&
    !/\bcoleccion\b/.test(normalized)
  ) {
    return {
      assistantMessage: "Te muestro el detalle del Pokemon que pediste.",
      toolCalls: [{ toolName: "get_pokemon", args: { pokemon: pokemonCandidate } }],
    };
  }

  if (/\b(recomienda|recomiendas|recomendar|recomendacion|sugerencia|sugerir)\b/.test(normalized)) {
    const recommendationTypeCandidate =
      pokemonTypeCandidate ?? extractLoosePokemonTypeCandidate(normalized);

    if (recommendationTypeCandidate) {
        return {
          assistantMessage: "Te doy recomendaciones de ese tipo usando tu coleccion actual.",
          toolCalls: [
          {
            toolName: "recommend_pokemon_by_type",
            args: { type: recommendationTypeCandidate, count: 3 },
          },
          ],
        };
      }

      return {
        assistantMessage: "Te doy una recomendacion usando tu coleccion actual.",
        toolCalls: [{ toolName: "recommend_pokemon", args: { count: 3 } }],
      };
  }

  if (/\b(cuantos|cuantas|estadistica|estadisticas|stats|tipos|total)\b/.test(normalized)) {
    return {
      assistantMessage: "Te comparto estadisticas objetivas de tu coleccion.",
      toolCalls: [{ toolName: "get_collection_stats", args: {} }],
    };
  }

  if (/\b(herramientas|tools|capacidades|comandos|que puedes hacer)\b/.test(normalized)) {
    return {
      assistantMessage:
        "Tengo herramientas para: ver coleccion, estadisticas, detalle de Pokemon, busqueda por nombre o tipo, recomendaciones y acciones de agregar/eliminar con confirmacion.",
      toolCalls: [],
    };
  }

  if (/\b(mi coleccion|mostrar coleccion|ver coleccion|muestrame mi coleccion|muestrame la coleccion)\b/.test(normalized)) {
    return {
      assistantMessage: "Te muestro tu coleccion actual.",
      toolCalls: [{ toolName: "get_collection", args: { limit: 20 } }],
    };
  }

  if (pokemonTypeCandidate && !/\b(agrega|agregar|agregalo|anade|añade|elimina|eliminar|quita|quitar|borra|borrar)\b/.test(normalized)) {
    return {
      assistantMessage: "Te comparto algunos Pokemon de ese tipo.",
      toolCalls: [{ toolName: "search_pokemon_by_type", args: { type: pokemonTypeCandidate, limit: 10 } }],
    };
  }

  if (/\b(busca|buscar)\b/.test(normalized) && pokemonCandidate) {
    return {
      assistantMessage: "Hice una busqueda directa en Pokedex.",
      toolCalls: [{ toolName: "search_pokemon", args: { query: pokemonCandidate } }],
    };
  }

  if (/\b(detalle|detalles|info|informacion|datos de)\b/.test(normalized) && pokemonCandidate) {
    return {
      assistantMessage: "Te comparto el detalle del Pokemon solicitado.",
      toolCalls: [{ toolName: "get_pokemon", args: { pokemon: pokemonCandidate } }],
    };
  }

  if (/\b(agrega|agregar|agregalo|anade|añade|guardar|guarda)\b/.test(normalized)) {
    if (!pokemonCandidate) {
      return {
        assistantMessage:
          "Puedo agregar un Pokemon, pero necesito que me indiques el nombre o ID.",
        toolCalls: [],
      };
    }

    return {
      assistantMessage: "Intentare agregar ese Pokemon a tu coleccion.",
      toolCalls: [{ toolName: "add_to_collection", args: { pokemon: pokemonCandidate, quantity: 1 } }],
    };
  }

  if (/\b(elimina|eliminar|quita|quitar|borra|borrar)\b/.test(normalized)) {
    if (!pokemonCandidate) {
      return {
        assistantMessage:
          "Para eliminar, dime el nombre del Pokemon o el itemId.",
        toolCalls: [],
      };
    }

    return {
      assistantMessage: "Preparare la eliminacion y te pedire confirmacion.",
      toolCalls: [{ toolName: "remove_from_collection", args: { pokemon: pokemonCandidate } }],
    };
  }

  return {
    assistantMessage:
      "Puedo ayudarte con comandos directos: 'muestra mi coleccion', 'estadisticas', 'recomiendame', 'pokemon de fuego', 'agrega pikachu', 'elimina bulbasaur'.",
    toolCalls: [],
  };
}
