import type { CollectionItem } from "@/domain/collection/collection-item";
import type { CollectionStats } from "@/domain/collection/collection-stats";

export function getCollectionStats(items: CollectionItem[]): CollectionStats {
  const typeDistribution: Record<string, number> = {};

  for (const item of items) {
    const pokemonTypes = item.pokemon?.types ?? [];

    for (const rawType of pokemonTypes) {
      const normalizedType = rawType.toLowerCase();
      typeDistribution[normalizedType] = (typeDistribution[normalizedType] ?? 0) + item.quantity;
    }
  }

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const duplicateEntries = items.filter((item) => item.quantity > 1).length;

  return {
    totalPokemon: items.length,
    totalUnits,
    duplicateEntries,
    typeDistribution,
  };
}