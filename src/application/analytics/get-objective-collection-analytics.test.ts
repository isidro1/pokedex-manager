import { describe, expect, it } from "vitest";
import type { CollectionItem } from "@/domain/collection/collection-item";
import { getObjectiveCollectionAnalytics } from "@/application/analytics/get-objective-collection-analytics";

const sampleCollection: CollectionItem[] = [
  {
    id: "a",
    userId: "user-1",
    pokemonId: 25,
    quantity: 2,
    source: "MANUAL",
    pokemon: {
      id: 25,
      name: "pikachu",
      types: ["electric"],
      spriteUrl: null,
    },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "b",
    userId: "user-1",
    pokemonId: 7,
    quantity: 1,
    source: "IMAGE",
    pokemon: {
      id: 7,
      name: "squirtle",
      types: ["water"],
      spriteUrl: null,
    },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "c",
    userId: "user-1",
    pokemonId: 6,
    quantity: 1,
    source: "AI",
    pokemon: {
      id: 6,
      name: "charizard",
      types: ["fire", "flying"],
      spriteUrl: null,
    },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
];

describe("getObjectiveCollectionAnalytics", () => {
  it("calcula metricas objetivas y recomendaciones deterministicas", () => {
    const result = getObjectiveCollectionAnalytics(sampleCollection);

    expect(result.totalPokemon).toBe(3);
    expect(result.totalUnits).toBe(4);
    expect(result.duplicateEntries).toBe(1);
    expect(result.topTypes[0]).toEqual({ type: "electric", count: 2 });
    expect(result.missingTypes).toContain("dragon");
    expect(result.deterministicRecommendations.length).toBeGreaterThan(0);
  });
});
