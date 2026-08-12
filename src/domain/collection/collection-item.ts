import type { Pokemon } from "@/domain/pokemon/pokemon";

export type CollectionSource = "MANUAL" | "IMAGE" | "AI";

export interface CollectionItem {
  id: string;
  userId: string;
  pokemonId: number;
  quantity: number;
  nickname?: string;
  notes?: string;
  source: CollectionSource;
  pokemon?: Pokemon;
  createdAt: Date;
  updatedAt: Date;
}