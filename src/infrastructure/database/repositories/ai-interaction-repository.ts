import type { Prisma } from "@prisma/client";
import type { AIInteractionOverview } from "@/domain/ai/ai-interaction-overview";
import { prisma } from "@/infrastructure/database/prisma";

type CreateAIInteractionInput = {
  userId: string;
  operation: string;
  model: string;
  latencyMs?: number;
  success: boolean;
  toolCalls?: unknown;
};

function countToolCalls(toolCalls: Prisma.JsonValue | null): number {
  if (!toolCalls) {
    return 0;
  }

  if (Array.isArray(toolCalls)) {
    return toolCalls.length;
  }

  if (typeof toolCalls === "object") {
    return 1;
  }

  return 0;
}

export async function createAIInteraction(input: CreateAIInteractionInput): Promise<void> {
  await prisma.aIInteraction.create({
    data: {
      userId: input.userId,
      operation: input.operation,
      model: input.model,
      latencyMs: input.latencyMs,
      success: input.success,
      toolCalls: (input.toolCalls as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}

export async function getAIInteractionOverview(
  userId: string,
  input?: { days?: number; limit?: number },
): Promise<AIInteractionOverview> {
  const safeDays = Math.min(Math.max(input?.days ?? 30, 1), 90);
  const safeLimit = Math.min(Math.max(input?.limit ?? 300, 30), 2000);
  const sinceDate = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const interactions = await prisma.aIInteraction.findMany({
    where: {
      userId,
      createdAt: {
        gte: sinceDate,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: safeLimit,
    select: {
      operation: true,
      model: true,
      success: true,
      latencyMs: true,
      toolCalls: true,
    },
  });

  const operationCount = new Map<string, number>();
  const modelCount = new Map<string, number>();
  let successRuns = 0;
  let failedRuns = 0;
  let latencyTotal = 0;
  let latencySamples = 0;
  let totalToolCalls = 0;

  for (const interaction of interactions) {
    operationCount.set(
      interaction.operation,
      (operationCount.get(interaction.operation) ?? 0) + 1,
    );

    modelCount.set(
      interaction.model,
      (modelCount.get(interaction.model) ?? 0) + 1,
    );

    if (interaction.success) {
      successRuns += 1;
    } else {
      failedRuns += 1;
    }

    if (typeof interaction.latencyMs === "number" && interaction.latencyMs >= 0) {
      latencyTotal += interaction.latencyMs;
      latencySamples += 1;
    }

    totalToolCalls += countToolCalls(interaction.toolCalls);
  }

  const totalRuns = interactions.length;
  const successRate = totalRuns === 0 ? 0 : Math.round((successRuns / totalRuns) * 100);

  const topOperations = [...operationCount.entries()]
    .map(([operation, count]) => ({ operation, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const modelUsage = [...modelCount.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return {
    totalRuns,
    successRuns,
    failedRuns,
    successRate,
    averageLatencyMs: latencySamples === 0 ? null : Math.round(latencyTotal / latencySamples),
    totalToolCalls,
    topOperations,
    modelUsage,
  };
}
