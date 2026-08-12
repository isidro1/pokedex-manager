import { CollectionSource as PrismaCollectionSource } from "@prisma/client";
import type { CollectionItem } from "@/domain/collection/collection-item";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { NotFoundError, ValidationError } from "@/lib/errors/application-errors";
import { prisma } from "@/infrastructure/database/prisma";
import {
  getPokemonById,
  getPokemonByNameOrId,
  searchPokemon,
  searchPokemonByType,
  suggestPokemonNames,
} from "@/infrastructure/pokemon-api/pokeapi-client";

type CreateCollectionItemParams = {
  userId: string;
  pokemonId: number;
  quantity: number;
  nickname?: string;
  notes?: string;
  source: "MANUAL" | "IMAGE" | "AI";
};

type UpdateCollectionItemParams = {
  itemId: string;
  userId: string;
  quantity?: number;
  nickname?: string;
  notes?: string;
};

function mapSource(source: CreateCollectionItemParams["source"]): PrismaCollectionSource {
  return source;
}

async function mapWithPokemonDetails(item: {
  id: string;
  userId: string;
  pokemonId: number;
  quantity: number;
  nickname: string | null;
  notes: string | null;
  source: PrismaCollectionSource;
  createdAt: Date;
  updatedAt: Date;
}): Promise<CollectionItem> {
  const pokemon = await getPokemonById(item.pokemonId);

  return {
    id: item.id,
    userId: item.userId,
    pokemonId: item.pokemonId,
    quantity: item.quantity,
    nickname: item.nickname ?? undefined,
    notes: item.notes ?? undefined,
    source: item.source,
    pokemon,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getCollectionByUserId(userId: string): Promise<CollectionItem[]> {
  const items = await prisma.collectionItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(items.map((item) => mapWithPokemonDetails(item)));
}

export async function createCollectionItem(params: CreateCollectionItemParams): Promise<CollectionItem> {
  if (!Number.isInteger(params.quantity) || params.quantity < 1) {
    throw new ValidationError("La cantidad debe ser un entero mayor o igual a 1");
  }

  await getPokemonById(params.pokemonId);

  const item = await prisma.collectionItem.create({
    data: {
      userId: params.userId,
      pokemonId: params.pokemonId,
      quantity: params.quantity,
      nickname: params.nickname?.trim() || null,
      notes: params.notes?.trim() || null,
      source: mapSource(params.source),
    },
  });

  return mapWithPokemonDetails(item);
}

export async function updateCollectionItem(params: UpdateCollectionItemParams): Promise<CollectionItem> {
  const existingItem = await prisma.collectionItem.findFirst({
    where: {
      id: params.itemId,
      userId: params.userId,
    },
  });

  if (!existingItem) {
    throw new NotFoundError("No se encontro el item de coleccion");
  }

  if (
    params.quantity !== undefined &&
    (!Number.isInteger(params.quantity) || params.quantity < 1)
  ) {
    throw new ValidationError("La cantidad debe ser un entero mayor o igual a 1");
  }

  const updatedItem = await prisma.collectionItem.update({
    where: {
      id: params.itemId,
    },
    data: {
      quantity: params.quantity,
      nickname: params.nickname?.trim() || null,
      notes: params.notes?.trim() || null,
    },
  });

  return mapWithPokemonDetails(updatedItem);
}

export async function deleteCollectionItem(itemId: string, userId: string): Promise<void> {
  const result = await prisma.collectionItem.deleteMany({
    where: {
      id: itemId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundError("No se encontro el item de coleccion");
  }
}

export async function findPokemonByNameOrId(value: string): Promise<Pokemon> {
  return getPokemonByNameOrId(value);
}

export async function searchPokemonInPokedex(query: string): Promise<Pokemon[]> {
  return searchPokemon(query);
}

export async function searchPokemonByTypeInPokedex(type: string, limit?: number): Promise<Pokemon[]> {
  return searchPokemonByType(type, limit);
}

export async function searchPokemonNameSuggestionsInPokedex(
  query: string,
  limit?: number,
): Promise<string[]> {
  return suggestPokemonNames(query, limit);
}