import { z } from "zod";

export const addCollectionItemSchema = z.object({
  pokemonId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(999),
  nickname: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
  source: z.enum(["MANUAL", "IMAGE", "AI"]).default("MANUAL"),
});

export const updateCollectionItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  nickname: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export const deleteCollectionItemSchema = z.object({
  itemId: z.string().min(1),
});

export const searchPokemonSchema = z.object({
  q: z.string().trim().min(2).max(40),
});