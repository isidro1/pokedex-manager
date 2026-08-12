import { MessageRole } from "@prisma/client";
import { imageUploadConstraints } from "@/schemas/ai-schemas";
import {
  addConversationMessage,
  createConversationForUser,
  listConversationMessages,
} from "@/infrastructure/database/repositories/conversation-repository";
import {
  MCP_TOOL_DEFINITIONS,
  executeMcpTool,
  type MCPToolName,
} from "@/infrastructure/mcp/mcp-server";
import { decideAssistantPlanWithGemini } from "@/infrastructure/gemini/gemini-provider";
import { buildFallbackAssistantPlan } from "@/application/assistant/assistant-fallback-planner";
import { identifyPokemonFromImage } from "@/application/image-identification/identify-pokemon-from-image";
import { createAIInteraction } from "@/infrastructure/database/repositories/ai-interaction-repository";
import { ValidationError } from "@/lib/errors/application-errors";
import { logger } from "@/lib/logging/logger";

const PENDING_ACTION_PREFIX = "PENDING_ACTION:";
const PENDING_ACTION_CLEARED_PREFIX = "PENDING_ACTION_CLEARED";
const ASSISTANT_CONTEXT_WINDOW_MESSAGES = 20;

type PendingActionPayload = {
  toolName: MCPToolName;
  args: Record<string, unknown>;
};

type AssistantTurnInput = {
  userId: string;
  conversationId?: string;
  userMessage: string;
  imageFile?: File | null;
};

type AssistantTurnResult = {
  conversationId: string;
  assistantMessage: string;
  requiresConfirmation: boolean;
};

type AIInteractionLogInput = {
  userId: string;
  operation: string;
  model: string;
  latencyMs: number;
  success: boolean;
  toolCalls?: unknown;
};

async function logAIInteractionSafely(input: AIInteractionLogInput): Promise<void> {
  try {
    await createAIInteraction(input);
  } catch (error) {
    logger.warn({
      operation: "assistant.interaction.log.failed",
      message: "No se pudo registrar telemetria del assistant",
      details: {
        userId: input.userId,
        reason: error instanceof Error ? error.message : "Error desconocido",
      },
    });
  }
}

function normalizeMessage(message: string): string {
  const trimmedMessage = message.trim();
  return trimmedMessage.length > 0 ? trimmedMessage : "";
}

function isConfirmationMessage(message: string): boolean {
  return /\b(si|sí|yes|confirmo|confirmar|adelante)\b/i.test(message);
}

function isCancellationMessage(message: string): boolean {
  return /\b(no|cancelar|cancela|cancelado)\b/i.test(message);
}

function buildPendingActionMessage(payload: PendingActionPayload): string {
  return `${PENDING_ACTION_PREFIX}${JSON.stringify(payload)}`;
}

function buildPendingActionClearedMessage(): string {
  return `${PENDING_ACTION_CLEARED_PREFIX}:${new Date().toISOString()}`;
}

function getLatestPendingAction(
  messages: Array<{ role: MessageRole; content: string }>,
): PendingActionPayload | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "SYSTEM") {
      continue;
    }

    if (message.content.startsWith(PENDING_ACTION_CLEARED_PREFIX)) {
      return null;
    }

    if (message.content.startsWith(PENDING_ACTION_PREFIX)) {
      const rawPayload = message.content.replace(PENDING_ACTION_PREFIX, "");
      try {
        return JSON.parse(rawPayload) as PendingActionPayload;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function formatToolResult(toolName: string, result: unknown): string {
  const rawText = JSON.stringify(result);
  const compactText = rawText.length > 800 ? `${rawText.slice(0, 800)}...` : rawText;
  return `[${toolName}] ${compactText}`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function summarizePokemonList(items: unknown[], title: string, maxItems = 5): string {
  const summaryLines = items
    .map((item) => {
      if (!isObjectRecord(item)) {
        return null;
      }

      const name = typeof item.name === "string" ? item.name : null;
      const id = typeof item.id === "number" ? `#${item.id}` : "#?";
      const types = Array.isArray(item.types)
        ? item.types.filter((type): type is string => typeof type === "string")
        : [];

      if (!name) {
        return null;
      }

      const typeLabel = types.length > 0 ? ` (${types.join("/")})` : "";
      return `${id} ${name}${typeLabel}`;
    })
    .filter((value): value is string => value !== null)
    .slice(0, maxItems);

  if (summaryLines.length === 0) {
    return `${title}: sin resultados.`;
  }

  return `${title}: ${summaryLines.join(" | ")}.`;
}

function summarizeToolResult(toolName: string, result: unknown): string {
  if (toolName === "add_to_collection" && isObjectRecord(result)) {
    const pokemon = isObjectRecord(result.pokemon) ? result.pokemon : null;
    const pokemonName = typeof pokemon?.name === "string" ? pokemon.name : "pokemon";
    const quantity = typeof result.quantity === "number" ? result.quantity : 1;
    return `Agregado ${pokemonName} x${quantity} a tu coleccion.`;
  }

  if (toolName === "remove_from_collection" && isObjectRecord(result)) {
    const removedPokemon =
      typeof result.removedPokemon === "string" ? result.removedPokemon : null;

    if (removedPokemon) {
      return `Elimine ${removedPokemon} de tu coleccion.`;
    }

    return "Elemento eliminado de tu coleccion.";
  }

  if (toolName === "get_pokemon" && isObjectRecord(result)) {
    const name = typeof result.name === "string" ? result.name : "desconocido";
    const id = typeof result.id === "number" ? result.id : "?";
    const types = Array.isArray(result.types)
      ? result.types.filter((type): type is string => typeof type === "string")
      : [];
    const abilities = Array.isArray(result.abilities)
      ? result.abilities.filter((ability): ability is string => typeof ability === "string")
      : [];
    const heightM = typeof result.heightM === "number" ? result.heightM : null;
    const weightKg = typeof result.weightKg === "number" ? result.weightKg : null;
    const baseExperience = typeof result.baseExperience === "number"
      ? result.baseExperience
      : null;

    const typeLabel = types.length > 0 ? types.join(", ") : "sin tipos";
    const abilityLabel = abilities.length > 0 ? abilities.slice(0, 3).join(", ") : "N/A";
    const heightLabel = heightM !== null ? `${heightM.toFixed(1)} m` : "N/A";
    const weightLabel = weightKg !== null ? `${weightKg.toFixed(1)} kg` : "N/A";
    const expLabel = baseExperience !== null ? `${baseExperience}` : "N/A";

    return `Pokemon #${id}: ${name} | Tipos: ${typeLabel} | Habilidades: ${abilityLabel} | Altura: ${heightLabel} | Peso: ${weightLabel} | Exp base: ${expLabel}.`;
  }

  if (toolName === "search_pokemon" && Array.isArray(result)) {
    return summarizePokemonList(result, "Resultados encontrados", 6);
  }

  if (toolName === "search_pokemon_by_type" && Array.isArray(result)) {
    return summarizePokemonList(result, "Pokemon de ese tipo", 8);
  }

  if (toolName === "get_collection" && Array.isArray(result)) {
    return `Tu coleccion actual tiene ${result.length} registros.`;
  }

  if (toolName === "get_collection_stats" && isObjectRecord(result)) {
    const totalPokemon = typeof result.totalPokemon === "number" ? result.totalPokemon : 0;
    const totalUnits = typeof result.totalUnits === "number" ? result.totalUnits : 0;
    const duplicates =
      typeof result.duplicateEntries === "number" ? result.duplicateEntries : 0;

    return `Estadisticas: ${totalPokemon} Pokemon, ${totalUnits} unidades, ${duplicates} duplicados.`;
  }

  if (toolName === "recommend_pokemon" && Array.isArray(result)) {
    return summarizePokemonList(result, "Recomendaciones", 6);
  }

  if (toolName === "recommend_pokemon_by_type" && Array.isArray(result)) {
    return summarizePokemonList(result, "Recomendaciones de ese tipo", 6);
  }

  return "Herramienta ejecutada correctamente.";
}

function validateImageFile(file: File): void {
  if (!imageUploadConstraints.allowedMimeTypes.includes(file.type as (typeof imageUploadConstraints.allowedMimeTypes)[number])) {
    throw new ValidationError("Formato de imagen no permitido para el assistant");
  }

  if (file.size > imageUploadConstraints.maxSizeBytes) {
    throw new ValidationError("La imagen excede el tamano maximo permitido de 5MB");
  }
}

async function createAssistantMessage(conversationId: string, userId: string, content: string) {
  await addConversationMessage({
    conversationId,
    userId,
    role: "ASSISTANT",
    content,
  });
}

async function executePendingAction(
  conversationId: string,
  userId: string,
  pendingAction: PendingActionPayload,
): Promise<string> {
  const result = await executeMcpTool({
    userId,
    toolName: pendingAction.toolName,
    args: pendingAction.args,
    allowDestructive: true,
  });

  await addConversationMessage({
    conversationId,
    userId,
    role: "TOOL",
    content: formatToolResult(pendingAction.toolName, result),
  });

  await addConversationMessage({
    conversationId,
    userId,
    role: "SYSTEM",
    content: buildPendingActionClearedMessage(),
  });

  return "Accion confirmada y ejecutada correctamente.";
}

async function handleImageMessage(input: {
  conversationId: string;
  userId: string;
  message: string;
  imageFile: File;
}): Promise<string> {
  validateImageFile(input.imageFile);

  const imageBuffer = await input.imageFile.arrayBuffer();
  const identifiedPokemon = await identifyPokemonFromImage({
    mimeType: input.imageFile.type,
    base64Image: Buffer.from(imageBuffer).toString("base64"),
  });

  const wantsToAdd = /\b(agrega|anade|añade|guardar|guarda)\b/i.test(input.message);

  if (wantsToAdd) {
    const createdItem = await executeMcpTool({
      userId: input.userId,
      toolName: "add_to_collection",
      args: {
        pokemon: identifiedPokemon.pokemon.name,
        quantity: 1,
      },
    });

    await addConversationMessage({
      conversationId: input.conversationId,
      userId: input.userId,
      role: "TOOL",
      content: formatToolResult("add_to_collection", createdItem),
    });

    return `Identifique a ${identifiedPokemon.pokemon.name} con confianza ${Math.round(identifiedPokemon.confidence * 100)}%. Ya lo agregue a tu coleccion.`;
  }

  return `Identifique a ${identifiedPokemon.pokemon.name} con confianza ${Math.round(identifiedPokemon.confidence * 100)}%. Si quieres, puedo agregarlo a tu coleccion con "agregalo".`;
}

function buildConversationContext(
  messages: Array<{ role: MessageRole; content: string }>,
): string {
  return messages
    .filter((message) => !message.content.startsWith(PENDING_ACTION_PREFIX))
    .filter((message) => !message.content.startsWith(PENDING_ACTION_CLEARED_PREFIX))
    .slice(-ASSISTANT_CONTEXT_WINDOW_MESSAGES)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

type AssistantPlan = {
  assistantMessage: string;
  toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>;
};

export async function handleAssistantTurn(
  input: AssistantTurnInput,
): Promise<AssistantTurnResult> {
  const startedAt = Date.now();

  const normalizedMessage = normalizeMessage(input.userMessage);

  if (!normalizedMessage && !input.imageFile) {
    throw new ValidationError("Debes enviar un mensaje o imagen");
  }

  const conversation = input.conversationId
    ? { id: input.conversationId }
    : await createConversationForUser(
        input.userId,
        normalizedMessage ? normalizedMessage.slice(0, 60) : "Nueva conversacion",
      );

  const conversationId = conversation.id;
  const previousMessages = await listConversationMessages(conversationId, input.userId);
  const pendingAction = getLatestPendingAction(previousMessages);

  const userContent = normalizedMessage || "Analiza la imagen adjunta";

  await addConversationMessage({
    conversationId,
    userId: input.userId,
    role: "USER",
    content: userContent,
  });

  if (pendingAction) {
    if (isCancellationMessage(userContent)) {
      await addConversationMessage({
        conversationId,
        userId: input.userId,
        role: "SYSTEM",
        content: buildPendingActionClearedMessage(),
      });

      const message = "Accion cancelada. No se realizaron cambios destructivos.";
      await createAssistantMessage(conversationId, input.userId, message);
      await logAIInteractionSafely({
        userId: input.userId,
        operation: "assistant.pending_action.cancel",
        model: "assistant-orchestrator",
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return {
        conversationId,
        assistantMessage: message,
        requiresConfirmation: false,
      };
    }

    if (isConfirmationMessage(userContent)) {
      const message = await executePendingAction(conversationId, input.userId, pendingAction);
      await createAssistantMessage(conversationId, input.userId, message);
      await logAIInteractionSafely({
        userId: input.userId,
        operation: "assistant.pending_action.confirm",
        model: "assistant-orchestrator",
        latencyMs: Date.now() - startedAt,
        success: true,
        toolCalls: [
          {
            toolName: pendingAction.toolName,
            args: pendingAction.args,
          },
        ],
      });

      return {
        conversationId,
        assistantMessage: message,
        requiresConfirmation: false,
      };
    }

    const message =
      "Hay una accion pendiente de confirmacion. Responde 'si' para ejecutar o 'cancelar' para descartarla.";
    await createAssistantMessage(conversationId, input.userId, message);
    await logAIInteractionSafely({
      userId: input.userId,
      operation: "assistant.pending_action.waiting_confirmation",
      model: "assistant-orchestrator",
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return {
      conversationId,
      assistantMessage: message,
      requiresConfirmation: true,
    };
  }

  if (input.imageFile) {
    const message = await handleImageMessage({
      conversationId,
      userId: input.userId,
      message: userContent,
      imageFile: input.imageFile,
    });

    await createAssistantMessage(conversationId, input.userId, message);
    await logAIInteractionSafely({
      userId: input.userId,
      operation: "assistant.image_turn",
      model: "gemini-2.5-flash",
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return {
      conversationId,
      assistantMessage: message,
      requiresConfirmation: false,
    };
  }

  const messagesAfterUserInput = await listConversationMessages(conversationId, input.userId);

  let plan: AssistantPlan;
  let plannerModel = "gemini-2.5-flash";

  try {
    plan = await decideAssistantPlanWithGemini({
      userMessage: userContent,
      conversationContext: buildConversationContext(messagesAfterUserInput),
      availableTools: MCP_TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Error desconocido";

    logger.warn({
      operation: "assistant.plan.fallback",
      message: "Se activo fallback planner para assistant",
      details: {
        conversationId,
        userId: input.userId,
        reason,
      },
    });

    plan = buildFallbackAssistantPlan(userContent);
    plannerModel = "fallback-planner";
  }

  const toolOutputs: string[] = [];

  for (const toolCall of plan.toolCalls) {
    const destructiveTool = MCP_TOOL_DEFINITIONS.find(
      (tool) => tool.name === toolCall.toolName,
    )?.destructive;

    if (destructiveTool) {
      await addConversationMessage({
        conversationId,
        userId: input.userId,
        role: "SYSTEM",
        content: buildPendingActionMessage({
          toolName: toolCall.toolName as MCPToolName,
          args: toolCall.args,
        }),
      });

      const message = `${plan.assistantMessage} Esta accion es destructiva. Responde 'si' para confirmar o 'cancelar' para detener.`;
      await createAssistantMessage(conversationId, input.userId, message);
      await logAIInteractionSafely({
        userId: input.userId,
        operation: "assistant.pending_action.created",
        model: plannerModel,
        latencyMs: Date.now() - startedAt,
        success: true,
        toolCalls: [toolCall],
      });

      return {
        conversationId,
        assistantMessage: message,
        requiresConfirmation: true,
      };
    }

    try {
      const toolResult = await executeMcpTool({
        userId: input.userId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        allowDestructive: false,
      });

      const formattedResult = formatToolResult(toolCall.toolName, toolResult);
      toolOutputs.push(summarizeToolResult(toolCall.toolName, toolResult));

      await addConversationMessage({
        conversationId,
        userId: input.userId,
        role: "TOOL",
        content: formattedResult,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      const formattedError = `[${toolCall.toolName}] ERROR: ${errorMessage}`;
      toolOutputs.push(`No pude ejecutar ${toolCall.toolName}: ${errorMessage}.`);

      await addConversationMessage({
        conversationId,
        userId: input.userId,
        role: "TOOL",
        content: formattedError,
      });
    }
  }

  const assistantMessage =
    toolOutputs.length > 0
      ? `${plan.assistantMessage}\n\nResultado:\n- ${toolOutputs.join("\n- ")}`
      : plan.assistantMessage;

  await createAssistantMessage(conversationId, input.userId, assistantMessage);
  await logAIInteractionSafely({
    userId: input.userId,
    operation: "assistant.tool_turn",
    model: plannerModel,
    latencyMs: Date.now() - startedAt,
    success: true,
    toolCalls: plan.toolCalls,
  });

  return {
    conversationId,
    assistantMessage,
    requiresConfirmation: false,
  };
}
