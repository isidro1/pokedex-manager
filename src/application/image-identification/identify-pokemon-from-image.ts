import type { ImageIdentificationResult } from "@/domain/ai/image-identification";
import { identifyPokemonWithGemini } from "@/infrastructure/gemini/gemini-provider";
import { getPokemonByName } from "@/infrastructure/pokemon-api/pokeapi-client";

export async function identifyPokemonFromImage(input: {
  mimeType: string;
  base64Image: string;
}): Promise<ImageIdentificationResult> {
  const geminiResult = await identifyPokemonWithGemini(input);
  const validatedPokemon = await getPokemonByName(geminiResult.pokemonName);

  return {
    pokemon: validatedPokemon,
    confidence: geminiResult.confidence,
    reasoning: geminiResult.reasoning,
  };
}
