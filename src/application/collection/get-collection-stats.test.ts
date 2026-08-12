import { describe, expect, it } from "vitest";
import type { CollectionItem } from "@/domain/collection/collection-item";
import { getCollectionStats } from "@/application/collection/get-collection-stats";

const sampleItems: CollectionItem[] = [
  {
    id: "item-1",
    userId: "user-1",
    pokemonId: 25,
    quantity: 2,
    nickname: "Electrico",
    notes: "Favorito",
    source: "MANUAL",
    pokemon: {
      id: 25,
      name: "pikachu",
      types: ["electric"],
      spriteUrl: "https://example.com/pikachu.png",
    },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  },
  {
    id: "item-2",
    userId: "user-1",
    pokemonId: 7,
    quantity: 1,
    source: "IMAGE",
    pokemon: {
      id: 7,
      name: "squirtle",
      types: ["water"],
      spriteUrl: "https://example.com/squirtle.png",
    },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  },
  {
    id: "item-3",
    userId: "user-1",
    pokemonId: 6,
    quantity: 1,
    source: "AI",
    pokemon: {
      id: 6,
      name: "charizard",
      types: ["fire", "flying"],
      spriteUrl: "https://example.com/charizard.png",
    },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  },
];

describe("getCollectionStats", () => {
  it("calcula estadisticas de forma consistente", () => {
    const stats = getCollectionStats(sampleItems);

    expect(stats.totalPokemon).toBe(3);
    expect(stats.totalUnits).toBe(4);
    expect(stats.duplicateEntries).toBe(1);
    expect(stats.typeDistribution).toEqual({
      electric: 2,
      water: 1,
      fire: 1,
      flying: 1,
    });
  });
});