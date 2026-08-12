import { z } from "zod";

export const listToolsRequestSchema = z.object({
  action: z.literal("list_tools"),
});

export const callToolRequestSchema = z.object({
  action: z.literal("call_tool"),
  toolName: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional(),
  allowDestructive: z.boolean().optional(),
});

export const mcpRequestSchema = z.discriminatedUnion("action", [
  listToolsRequestSchema,
  callToolRequestSchema,
]);

export const getCollectionToolArgsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const getPokemonToolArgsSchema = z.object({
  pokemon: z.string().trim().min(1).max(50),
});

export const searchPokemonToolArgsSchema = z.object({
  query: z.string().trim().min(2).max(50),
});

export const searchPokemonByTypeToolArgsSchema = z.object({
  type: z.string().trim().min(2).max(30),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const recommendPokemonToolArgsSchema = z.object({
  count: z.coerce.number().int().min(1).max(6).optional(),
});

export const recommendPokemonByTypeToolArgsSchema = z.object({
  type: z.string().trim().min(2).max(30),
  count: z.coerce.number().int().min(1).max(6).optional(),
});

export const addToCollectionToolArgsSchema = z.object({
  pokemon: z.string().trim().min(1).max(50),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  nickname: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export const removeFromCollectionToolArgsSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    pokemon: z.string().trim().min(1).max(50).optional(),
  })
  .refine((value) => value.itemId || value.pokemon, {
    message: "Debes enviar itemId o pokemon",
  });
