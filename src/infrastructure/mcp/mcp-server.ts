import {
  createCollectionItem,
  deleteCollectionItem,
  findPokemonByNameOrId,
  getCollectionByUserId,
  searchPokemonInPokedex,
  searchPokemonByTypeInPokedex,
} from "@/application/collection/collection-service";
import { getObjectiveCollectionAnalytics } from "@/application/analytics/get-objective-collection-analytics";
import {
  recommendPokemonByTypeForCollection,
  recommendPokemonForCollection,
} from "@/application/analytics/recommend-pokemon-for-collection";
import {
  addToCollectionToolArgsSchema,
  getCollectionToolArgsSchema,
  getPokemonToolArgsSchema,
  recommendPokemonByTypeToolArgsSchema,
  recommendPokemonToolArgsSchema,
  removeFromCollectionToolArgsSchema,
  searchPokemonByTypeToolArgsSchema,
  searchPokemonToolArgsSchema,
} from "@/infrastructure/mcp/mcp-tool-schemas";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/application-errors";

export type MCPToolName =
  | "get_collection"
  | "get_collection_stats"
  | "get_pokemon"
  | "search_pokemon"
  | "search_pokemon_by_type"
  | "recommend_pokemon"
  | "recommend_pokemon_by_type"
  | "add_to_collection"
  | "remove_from_collection";

export interface MCPToolDefinition {
  name: MCPToolName;
  displayName: string;
  description: string;
  category: "consulta" | "analitica" | "accion";
  destructive?: boolean;
}

export const MCP_TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "get_collection",
    displayName: "Ver Coleccion",
    description: "Obtiene la coleccion completa del usuario autenticado.",
    category: "consulta",
  },
  {
    name: "get_collection_stats",
    displayName: "Estadisticas de Coleccion",
    description: "Calcula metricas objetivas de la coleccion del usuario.",
    category: "analitica",
  },
  {
    name: "get_pokemon",
    displayName: "Detalle de Pokemon",
    description: "Obtiene detalle de un Pokemon por nombre o id.",
    category: "consulta",
  },
  {
    name: "search_pokemon",
    displayName: "Buscar Pokemon",
    description: "Busca Pokemon por nombre parcial o id.",
    category: "consulta",
  },
  {
    name: "search_pokemon_by_type",
    displayName: "Buscar por Tipo",
    description: "Busca Pokemon por tipo (ej: fuego, agua, electric).",
    category: "consulta",
  },
  {
    name: "recommend_pokemon",
    displayName: "Recomendar Pokemon",
    description: "Sugiere Pokemon para diversificar la coleccion.",
    category: "analitica",
  },
  {
    name: "recommend_pokemon_by_type",
    displayName: "Recomendar por Tipo",
    description: "Recomienda Pokemon de un tipo para tu coleccion (prioriza no repetidos).",
    category: "analitica",
  },
  {
    name: "add_to_collection",
    displayName: "Agregar a Coleccion",
    description: "Agrega un Pokemon validado a la coleccion del usuario.",
    category: "accion",
  },
  {
    name: "remove_from_collection",
    displayName: "Eliminar de Coleccion",
    description: "Elimina un item de la coleccion por itemId o pokemon.",
    category: "accion",
    destructive: true,
  },
];

function getToolDefinition(toolName: string): MCPToolDefinition {
  const toolDefinition = MCP_TOOL_DEFINITIONS.find((tool) => tool.name === toolName);
  if (!toolDefinition) {
    throw new NotFoundError("Tool MCP no encontrada");
  }

  return toolDefinition;
}

export function listMcpTools(): MCPToolDefinition[] {
  return MCP_TOOL_DEFINITIONS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickBestPokemonArg(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        return normalized;
      }
      continue;
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return null;
}

function normalizeGetPokemonArgs(args: Record<string, unknown>): Record<string, unknown> {
  const pokemonObject = isRecord(args.pokemon) ? args.pokemon : null;

  const normalizedPokemon = pickBestPokemonArg(
    args.pokemon,
    args.name,
    args.query,
    args.id,
    pokemonObject?.name,
    pokemonObject?.value,
    pokemonObject?.id,
  );

  if (!normalizedPokemon) {
    return args;
  }

  return {
    ...args,
    pokemon: normalizedPokemon,
  };
}

async function removeCollectionItemByPokemonName(userId: string, pokemon: string) {
  const targetPokemon = await findPokemonByNameOrId(pokemon);
  const collection = await getCollectionByUserId(userId);
  const matchingItem = collection.find((item) => item.pokemonId === targetPokemon.id);

  if (!matchingItem) {
    throw new NotFoundError("No se encontro un item de ese Pokemon en la coleccion");
  }

  await deleteCollectionItem(matchingItem.id, userId);
  return {
    removedItemId: matchingItem.id,
    removedPokemon: targetPokemon.name,
  };
}

export async function executeMcpTool(input: {
  userId: string;
  toolName: string;
  args?: Record<string, unknown>;
  allowDestructive?: boolean;
}): Promise<unknown> {
  const toolDefinition = getToolDefinition(input.toolName);
  const args = input.args ?? {};

  if (toolDefinition.destructive && !input.allowDestructive) {
    throw new AuthorizationError("La herramienta destructiva requiere confirmacion explicita");
  }

  switch (toolDefinition.name) {
    case "get_collection": {
      const validatedArgs = getCollectionToolArgsSchema.parse(args);
      const collection = await getCollectionByUserId(input.userId);

      if (!validatedArgs.limit) {
        return collection;
      }

      return collection.slice(0, validatedArgs.limit);
    }

    case "get_collection_stats": {
      const collection = await getCollectionByUserId(input.userId);
      return getObjectiveCollectionAnalytics(collection);
    }

    case "get_pokemon": {
      const normalizedArgs = normalizeGetPokemonArgs(args);
      const validatedArgs = getPokemonToolArgsSchema.parse(normalizedArgs);
      return findPokemonByNameOrId(validatedArgs.pokemon);
    }

    case "search_pokemon": {
      const validatedArgs = searchPokemonToolArgsSchema.parse(args);
      return searchPokemonInPokedex(validatedArgs.query);
    }

    case "search_pokemon_by_type": {
      const validatedArgs = searchPokemonByTypeToolArgsSchema.parse(args);
      return searchPokemonByTypeInPokedex(validatedArgs.type, validatedArgs.limit ?? 12);
    }

    case "recommend_pokemon": {
      const validatedArgs = recommendPokemonToolArgsSchema.parse(args);
      return recommendPokemonForCollection(input.userId, validatedArgs.count ?? 3);
    }

    case "recommend_pokemon_by_type": {
      const validatedArgs = recommendPokemonByTypeToolArgsSchema.parse(args);
      return recommendPokemonByTypeForCollection({
        userId: input.userId,
        type: validatedArgs.type,
        count: validatedArgs.count ?? 3,
      });
    }

    case "add_to_collection": {
      const validatedArgs = addToCollectionToolArgsSchema.parse(args);
      const pokemon = await findPokemonByNameOrId(validatedArgs.pokemon);

      return createCollectionItem({
        userId: input.userId,
        pokemonId: pokemon.id,
        quantity: validatedArgs.quantity ?? 1,
        nickname: validatedArgs.nickname,
        notes: validatedArgs.notes,
        source: "AI",
      });
    }

    case "remove_from_collection": {
      const validatedArgs = removeFromCollectionToolArgsSchema.parse(args);

      if (validatedArgs.itemId) {
        await deleteCollectionItem(validatedArgs.itemId, input.userId);
        return { removedItemId: validatedArgs.itemId };
      }

      if (validatedArgs.pokemon) {
        return removeCollectionItemByPokemonName(input.userId, validatedArgs.pokemon);
      }

      throw new ValidationError("No se pudo interpretar el objetivo de eliminacion");
    }

    default:
      throw new NotFoundError("Tool MCP no soportada");
  }
}
