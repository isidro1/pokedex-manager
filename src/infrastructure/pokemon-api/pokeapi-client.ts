import { ExternalApiError, NotFoundError } from "@/lib/errors/application-errors";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { getServerEnv } from "@/lib/env/server-env";

const POKE_API_BASE_URL = getServerEnv().POKE_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 8000;
const POKEDEX_NAME_INDEX_LIMIT = 1302;
const NAME_INDEX_CACHE_TTL_MS = 1000 * 60 * 60;

type RawPokemon = {
  id: number;
  name: string;
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string } }>;
  height: number;
  weight: number;
  base_experience: number | null;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
};

type RawPokemonListResponse = {
  results: Array<{ name: string }>;
};

type RawPokemonByTypeResponse = {
  pokemon: Array<{
    pokemon: {
      name: string;
    };
  }>;
};

const POKEMON_TYPE_ALIASES: Record<string, string> = {
  normal: "normal",
  fuego: "fire",
  fire: "fire",
  agua: "water",
  water: "water",
  planta: "grass",
  hierba: "grass",
  grass: "grass",
  electrico: "electric",
  electric: "electric",
  hielo: "ice",
  ice: "ice",
  lucha: "fighting",
  fighting: "fighting",
  veneno: "poison",
  poison: "poison",
  tierra: "ground",
  ground: "ground",
  volador: "flying",
  flying: "flying",
  psiquico: "psychic",
  psychic: "psychic",
  bicho: "bug",
  bug: "bug",
  roca: "rock",
  rock: "rock",
  fantasma: "ghost",
  ghost: "ghost",
  dragon: "dragon",
  siniestro: "dark",
  dark: "dark",
  acero: "steel",
  steel: "steel",
  hada: "fairy",
  fairy: "fairy",
};

const POKEMON_NAME_ALIASES: Record<string, string> = {
  picachu: "pikachu",
  pikatchu: "pikachu",
  charisar: "charizard",
  charizar: "charizard",
  bulvasaur: "bulbasaur",
  bulbasor: "bulbasaur",
  mewtu: "mewtwo",
  rayquazaa: "rayquaza",
};

let pokemonNameIndexCache:
  | {
      names: string[];
      expiresAt: number;
    }
  | null = null;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizePokemonType(type: string): string {
  const normalizedType = normalizeText(type.trim());
  return POKEMON_TYPE_ALIASES[normalizedType] ?? normalizedType;
}

function normalizePokemonQuery(value: string): string {
  const normalizedValue = normalizeText(value.trim());
  return POKEMON_NAME_ALIASES[normalizedValue] ?? normalizedValue;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost,
      );
    }

    for (let column = 0; column <= b.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[b.length];
}

function rankPokemonNames(names: string[], query: string, limit: number): string[] {
  if (!query) {
    return names.slice(0, limit);
  }

  const exactMatches: string[] = [];
  const startsWithMatches: string[] = [];
  const includesMatches: string[] = [];
  const fuzzyMatches: Array<{ name: string; distance: number }> = [];

  const maxDistance = query.length >= 7 ? 2 : 1;

  for (const name of names) {
    if (name === query) {
      exactMatches.push(name);
      continue;
    }

    if (name.startsWith(query)) {
      startsWithMatches.push(name);
      continue;
    }

    if (name.includes(query)) {
      includesMatches.push(name);
      continue;
    }

    if (query.length >= 4) {
      const distance = levenshteinDistance(name, query);
      if (distance <= maxDistance) {
        fuzzyMatches.push({ name, distance });
      }
    }
  }

  fuzzyMatches.sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    return left.name.localeCompare(right.name);
  });

  return [...exactMatches, ...startsWithMatches, ...includesMatches, ...fuzzyMatches.map((item) => item.name)]
    .slice(0, limit);
}

async function getPokemonNameIndex(): Promise<string[]> {
  const now = Date.now();
  if (pokemonNameIndexCache && pokemonNameIndexCache.expiresAt > now) {
    return pokemonNameIndexCache.names;
  }

  const listResponse = await fetchJson<RawPokemonListResponse>(
    `${POKE_API_BASE_URL}/pokemon?limit=${POKEDEX_NAME_INDEX_LIMIT}&offset=0`,
  );

  const names = listResponse.results.map((pokemon) => pokemon.name);
  pokemonNameIndexCache = {
    names,
    expiresAt: now + NAME_INDEX_CACHE_TTL_MS,
  };

  return names;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 404) {
      throw new NotFoundError("Pokemon no encontrado");
    }

    if (!response.ok) {
      throw new ExternalApiError(`PokeAPI respondio con estado ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ExternalApiError) {
      throw error;
    }

    throw new ExternalApiError("Error de red al consultar PokeAPI");
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePokemon(rawPokemon: RawPokemon): Pokemon {
  return {
    id: rawPokemon.id,
    name: rawPokemon.name,
    types: rawPokemon.types.map((typeItem) => typeItem.type.name),
    spriteUrl: rawPokemon.sprites.front_default,
    artworkUrl: rawPokemon.sprites.other?.["official-artwork"]?.front_default ?? null,
    abilities: rawPokemon.abilities.map((abilityItem) => abilityItem.ability.name),
    heightM: rawPokemon.height / 10,
    weightKg: rawPokemon.weight / 10,
    baseExperience: rawPokemon.base_experience,
  };
}

export async function getPokemonById(pokemonId: number): Promise<Pokemon> {
  const rawPokemon = await fetchJson<RawPokemon>(`${POKE_API_BASE_URL}/pokemon/${pokemonId}`);
  return normalizePokemon(rawPokemon);
}

export async function getPokemonByName(pokemonName: string): Promise<Pokemon> {
  const normalizedName = normalizePokemonQuery(pokemonName);
  const rawPokemon = await fetchJson<RawPokemon>(`${POKE_API_BASE_URL}/pokemon/${normalizedName}`);
  return normalizePokemon(rawPokemon);
}

export async function getPokemonByNameOrId(value: string): Promise<Pokemon> {
  const normalizedValue = normalizePokemonQuery(value);
  const numericId = Number(normalizedValue);

  if (Number.isInteger(numericId) && numericId > 0) {
    return getPokemonById(numericId);
  }

  return getPokemonByName(normalizedValue);
}

export async function searchPokemon(query: string): Promise<Pokemon[]> {
  const normalizedQuery = normalizePokemonQuery(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const numericId = Number(normalizedQuery);
  if (Number.isInteger(numericId) && numericId > 0) {
    try {
      const pokemon = await getPokemonById(numericId);
      return [pokemon];
    } catch {
      return [];
    }
  }

  const names = await getPokemonNameIndex();
  const matchedNames = rankPokemonNames(names, normalizedQuery, 12);

  const matchedPokemon = await Promise.all(matchedNames.map((name) => getPokemonByName(name)));
  return matchedPokemon;
}

export async function suggestPokemonNames(query: string, limit = 10): Promise<string[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const normalizedQuery = normalizePokemonQuery(query);

  const names = await getPokemonNameIndex();
  return rankPokemonNames(names, normalizedQuery, safeLimit);
}

export async function searchPokemonByType(type: string, limit = 12): Promise<Pokemon[]> {
  const normalizedType = normalizePokemonType(type);
  if (!normalizedType) {
    return [];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 20);

  let typeResponse: RawPokemonByTypeResponse;
  try {
    typeResponse = await fetchJson<RawPokemonByTypeResponse>(
      `${POKE_API_BASE_URL}/type/${normalizedType}`,
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError("Tipo de Pokemon no encontrado");
    }

    throw error;
  }

  const candidateNames = [...new Set(typeResponse.pokemon.map((entry) => entry.pokemon.name))].slice(
    0,
    safeLimit,
  );

  return Promise.all(candidateNames.map((name) => getPokemonByName(name)));
}