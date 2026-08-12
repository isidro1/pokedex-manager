import type { Pokemon } from "@/domain/pokemon/pokemon";
import type { CollectionItem } from "@/domain/collection/collection-item";
import { getCollectionByUserId } from "@/application/collection/collection-service";
import { getObjectiveCollectionAnalytics } from "@/application/analytics/get-objective-collection-analytics";
import {
  getPokemonByName,
  searchPokemonByType,
} from "@/infrastructure/pokemon-api/pokeapi-client";

const TYPE_POKEMON_SUGGESTIONS: Record<string, string[]> = {
  fire: ["charmander", "growlithe"],
  water: ["squirtle", "lapras"],
  electric: ["pikachu", "magnemite"],
  grass: ["bulbasaur", "oddish"],
  ice: ["sneasel", "snorunt"],
  fighting: ["machop", "riolu"],
  poison: ["ekans", "koffing"],
  ground: ["sandshrew", "phanpy"],
  flying: ["pidgey", "zubat"],
  psychic: ["abra", "ralts"],
  bug: ["caterpie", "scyther"],
  rock: ["geodude", "onix"],
  ghost: ["gastly", "drifloon"],
  dragon: ["dratini", "bagon"],
  dark: ["murkrow", "houndour"],
  steel: ["aron", "skarmory"],
  fairy: ["clefairy", "snubbull"],
  normal: ["eevee", "snorlax"],
};

export async function recommendPokemonForCollection(
  userId: string,
  count = 3,
  preloadedCollection?: CollectionItem[],
): Promise<Pokemon[]> {
  const collection = preloadedCollection ?? await getCollectionByUserId(userId);
  const analytics = getObjectiveCollectionAnalytics(collection);

  const candidateNames = analytics.missingTypes
    .flatMap((type) => TYPE_POKEMON_SUGGESTIONS[type] ?? [])
    .slice(0, Math.max(count * 2, 6));

  const uniqueNames = [...new Set(candidateNames)].slice(0, count);

  if (uniqueNames.length === 0) {
    return [];
  }

  const suggestions = await Promise.all(uniqueNames.map((name) => getPokemonByName(name)));
  return suggestions;
}

export async function recommendPokemonByTypeForCollection(input: {
  userId: string;
  type: string;
  count?: number;
  preloadedCollection?: CollectionItem[];
}): Promise<Pokemon[]> {
  const safeCount = Math.min(Math.max(input.count ?? 3, 1), 6);
  const [collection, candidates] = await Promise.all([
    input.preloadedCollection
      ? Promise.resolve(input.preloadedCollection)
      : getCollectionByUserId(input.userId),
    searchPokemonByType(input.type, 30),
  ]);

  if (candidates.length === 0) {
    return [];
  }

  const ownedPokemonIds = new Set(collection.map((item) => item.pokemonId));
  const notOwnedCandidates = candidates.filter((pokemon) => !ownedPokemonIds.has(pokemon.id));
  const source = notOwnedCandidates.length > 0 ? notOwnedCandidates : candidates;

  return source.slice(0, safeCount);
}
