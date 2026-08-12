import type { Pokemon } from "@/domain/pokemon/pokemon";

export interface ImageIdentificationResult {
  pokemon: Pokemon;
  confidence: number;
  reasoning: string;
}
