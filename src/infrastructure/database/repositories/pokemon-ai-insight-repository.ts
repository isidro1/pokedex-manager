import { PrismaClient, type Prisma } from "@prisma/client";
import type { AICollectionInsights } from "@/domain/ai/collection-insights";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { prisma } from "@/infrastructure/database/prisma";
import { logger } from "@/lib/logging/logger";
import { aiCollectionInsightsSchema } from "@/schemas/ai-schemas";

type CreatePokemonAIInsightInput = {
  userId: string;
  pokemon: Pokemon;
  model: string;
  insights: AICollectionInsights;
};

export type LatestPokemonAIInsight = {
  pokemonId: number;
  model: string;
  insights: AICollectionInsights;
  pokemon: Pokemon;
  createdAt: Date;
};

type LatestPokemonAIInsightRow = {
  pokemonId: number;
  model: string;
  pokemonName: string | null;
  pokemonTypes: string[];
  spriteUrl: string | null;
  artworkUrl: string | null;
  insights: Prisma.JsonValue;
  createdAt: Date | string;
};

function parseInsights(rawInsights: Prisma.JsonValue): AICollectionInsights | null {
  const parsed = aiCollectionInsightsSchema.safeParse(rawInsights);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function normalizeCreatedAt(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function normalizePokemon(row: LatestPokemonAIInsightRow): Pokemon {
  return {
    id: row.pokemonId,
    name: row.pokemonName?.trim() || `pokemon-${row.pokemonId}`,
    types: Array.isArray(row.pokemonTypes) ? row.pokemonTypes : [],
    spriteUrl: row.spriteUrl,
    artworkUrl: row.artworkUrl,
  };
}

export async function createPokemonAIInsight(input: CreatePokemonAIInsightInput): Promise<void> {
  const data: Prisma.PokemonAIInsightUncheckedCreateInput = {
    userId: input.userId,
    pokemonId: input.pokemon.id,
    model: input.model,
    pokemonName: input.pokemon.name,
    pokemonTypes: input.pokemon.types,
    spriteUrl: input.pokemon.spriteUrl ?? null,
    artworkUrl: input.pokemon.artworkUrl ?? null,
    insights: input.insights as unknown as Prisma.InputJsonValue,
  };

  try {
    await prisma.pokemonAIInsight.create({ data });
    return;
  } catch (error) {
    const isMissingDelegateError =
      error instanceof TypeError &&
      (error.message.includes("reading 'create'") || error.message.includes("undefined"));

    if (!isMissingDelegateError) {
      throw error;
    }
  }

  logger.warn({
    operation: "analytics.pokemon_insights.persist.fallback_fresh_client",
    message: "Cliente Prisma stale detectado; se usa cliente fresco para persistir insights",
    details: {
      userId: input.userId,
      pokemonId: input.pokemon.id,
    },
  });

  const freshPrisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  try {
    await freshPrisma.pokemonAIInsight.create({ data });
  } finally {
    await freshPrisma.$disconnect().catch(() => undefined);
  }
}

export async function listLatestPokemonInsightsByUser(
  userId: string,
  limit = 200,
): Promise<LatestPokemonAIInsight[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 1000);

  const rows = await prisma.$queryRaw<LatestPokemonAIInsightRow[]>`
    SELECT DISTINCT ON ("pokemonId")
      "pokemonId",
      "model",
      "pokemonName",
      "pokemonTypes",
      "spriteUrl",
      "artworkUrl",
      "insights",
      "createdAt"
    FROM "public"."PokemonAIInsight"
    WHERE "userId" = ${userId}
    ORDER BY "pokemonId", "createdAt" DESC
  `;

  const normalizedRows = rows
    .map((row) => {
      const parsedInsights = parseInsights(row.insights);
      if (!parsedInsights) {
        logger.warn({
          operation: "analytics.pokemon_insights.invalid_payload",
          message: "El payload almacenado de insights IA no cumple el esquema esperado",
          details: {
            userId,
            pokemonId: row.pokemonId,
          },
        });
        return null;
      }

      return {
        pokemonId: row.pokemonId,
        model: row.model,
        insights: parsedInsights,
        pokemon: normalizePokemon(row),
        createdAt: normalizeCreatedAt(row.createdAt),
      } satisfies LatestPokemonAIInsight;
    })
    .filter((item): item is LatestPokemonAIInsight => item !== null)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return normalizedRows.slice(0, safeLimit);
}
