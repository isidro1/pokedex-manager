import { z } from "zod";

export const imageUploadConstraints = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const geminiImageIdentificationSchema = z.object({
  pokemonName: z.string().trim().min(1).max(80),
  confidence: z.coerce.number().min(0).max(1),
  reasoning: z.string().trim().min(1).max(260),
});

export const aiCollectionInsightsSchema = z.object({
  summary: z.string().trim().min(1).max(300),
  recommendations: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  curiosities: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  comparisonIdea: z.string().trim().min(1).max(220),
});

export const assistantToolCallSchema = z.object({
  toolName: z
    .string()
    .trim()
    .min(1)
    .max(50),
  args: z.record(z.string(), z.unknown()).default({}),
});

export const assistantPlanSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(500),
  toolCalls: z.array(assistantToolCallSchema).max(3).default([]),
});
