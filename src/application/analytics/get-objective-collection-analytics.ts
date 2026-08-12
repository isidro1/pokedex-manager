import type { ObjectiveCollectionAnalytics } from "@/domain/ai/collection-insights";
import type { CollectionItem } from "@/domain/collection/collection-item";
import { getCollectionStats } from "@/application/collection/get-collection-stats";

const ALL_POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

function getSortedTypePairs(typeDistribution: Record<string, number>) {
  return Object.entries(typeDistribution)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

function buildDeterministicRecommendations(missingTypes: string[], duplicateEntries: number): string[] {
  const recommendations: string[] = [];

  if (missingTypes.length > 0) {
    recommendations.push(
      `Agrega un Pokemon de tipo ${missingTypes[0]} para mejorar la diversidad de tu coleccion.`,
    );
  }

  if (missingTypes.length > 1) {
    recommendations.push(
      `Considera cubrir tambien el tipo ${missingTypes[1]} para balancear mejor tus coberturas.`,
    );
  }

  if (duplicateEntries > 0) {
    recommendations.push(
      "Tienes entradas duplicadas; compara sus roles y define si conviene consolidarlas o conservar variantes.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Tu distribucion actual es equilibrada; prueba construir equipos por rol o generacion.");
  }

  return recommendations;
}

export function getObjectiveCollectionAnalytics(items: CollectionItem[]): ObjectiveCollectionAnalytics {
  const stats = getCollectionStats(items);
  const sortedPairs = getSortedTypePairs(stats.typeDistribution);

  const representedTypes = new Set(Object.keys(stats.typeDistribution));
  const missingTypes = ALL_POKEMON_TYPES.filter((type) => !representedTypes.has(type));

  const diversityScore = Math.round(
    (representedTypes.size / ALL_POKEMON_TYPES.length) * 100,
  );

  return {
    totalPokemon: stats.totalPokemon,
    totalUnits: stats.totalUnits,
    duplicateEntries: stats.duplicateEntries,
    diversityScore,
    topTypes: sortedPairs.slice(0, 3),
    leastTypes: sortedPairs.slice(-3).reverse(),
    missingTypes,
    deterministicRecommendations: buildDeterministicRecommendations(
      missingTypes,
      stats.duplicateEntries,
    ),
  };
}
