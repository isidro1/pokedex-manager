import type { AICollectionInsights, ObjectiveCollectionAnalytics } from "@/domain/ai/collection-insights";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import {
  generateCollectionInsightsWithGemini,
  generatePokemonInsightsWithGemini,
} from "@/infrastructure/gemini/gemini-provider";
import { createAIInteraction } from "@/infrastructure/database/repositories/ai-interaction-repository";
import { createPokemonAIInsight } from "@/infrastructure/database/repositories/pokemon-ai-insight-repository";
import { logger } from "@/lib/logging/logger";

export async function generateAICollectionInsights(
  analytics: ObjectiveCollectionAnalytics,
  userId?: string,
): Promise<AICollectionInsights> {
  const startedAt = Date.now();

  try {
    const insights = await generateCollectionInsightsWithGemini({
      totalPokemon: analytics.totalPokemon,
      totalUnits: analytics.totalUnits,
      duplicateEntries: analytics.duplicateEntries,
      diversityScore: analytics.diversityScore,
      topTypes: analytics.topTypes,
      missingTypes: analytics.missingTypes,
    });

    if (userId) {
      try {
        await createAIInteraction({
          userId,
          operation: "analytics.collection_insights",
          model: "gemini-2.5-flash",
          latencyMs: Date.now() - startedAt,
          success: true,
        });
      } catch (error) {
        logger.warn({
          operation: "analytics.collection_insights.log.failed",
          message: "No se pudo registrar telemetria de analytics IA",
          details: {
            userId,
            reason: error instanceof Error ? error.message : "Error desconocido",
          },
        });
      }
    }

    return insights;
  } catch (error) {
    if (userId) {
      try {
        await createAIInteraction({
          userId,
          operation: "analytics.collection_insights",
          model: "gemini-2.5-flash",
          latencyMs: Date.now() - startedAt,
          success: false,
        });
      } catch (logError) {
        logger.warn({
          operation: "analytics.collection_insights.log.failed",
          message: "No se pudo registrar telemetria de analytics IA",
          details: {
            userId,
            reason: logError instanceof Error ? logError.message : "Error desconocido",
          },
        });
      }
    }

    throw error;
  }
}

export async function generateAIPokemonInsights(input: {
  pokemon: Pokemon;
  analytics: ObjectiveCollectionAnalytics;
  userId?: string;
}): Promise<{ insights: AICollectionInsights; persisted: boolean }> {
  const startedAt = Date.now();

  try {
    const insights = await generatePokemonInsightsWithGemini({
      pokemon: input.pokemon,
      collectionSummary: {
        totalPokemon: input.analytics.totalPokemon,
        totalUnits: input.analytics.totalUnits,
        diversityScore: input.analytics.diversityScore,
        missingTypes: input.analytics.missingTypes,
      },
    });

    let persisted = false;

    if (input.userId) {
      try {
        await createAIInteraction({
          userId: input.userId,
          operation: "analytics.pokemon_insights",
          model: "gemini-2.5-flash",
          latencyMs: Date.now() - startedAt,
          success: true,
        });
      } catch (error) {
        logger.warn({
          operation: "analytics.pokemon_insights.log.failed",
          message: "No se pudo registrar telemetria de analytics IA por pokemon",
          details: {
            userId: input.userId,
            reason: error instanceof Error ? error.message : "Error desconocido",
          },
        });
      }

      try {
        await createPokemonAIInsight({
          userId: input.userId,
          pokemon: input.pokemon,
          model: "gemini-2.5-flash",
          insights,
        });
        persisted = true;
      } catch (error) {
        logger.warn({
          operation: "analytics.pokemon_insights.persist.failed",
          message: "No se pudo guardar el insight IA del pokemon en base de datos",
          details: {
            userId: input.userId,
            pokemonId: input.pokemon.id,
            reason: error instanceof Error ? error.message : "Error desconocido",
          },
        });
      }
    }

    return {
      insights,
      persisted,
    };
  } catch (error) {
    if (input.userId) {
      try {
        await createAIInteraction({
          userId: input.userId,
          operation: "analytics.pokemon_insights",
          model: "gemini-2.5-flash",
          latencyMs: Date.now() - startedAt,
          success: false,
        });
      } catch (logError) {
        logger.warn({
          operation: "analytics.pokemon_insights.log.failed",
          message: "No se pudo registrar telemetria de analytics IA por pokemon",
          details: {
            userId: input.userId,
            reason: logError instanceof Error ? logError.message : "Error desconocido",
          },
        });
      }
    }

    throw error;
  }
}
