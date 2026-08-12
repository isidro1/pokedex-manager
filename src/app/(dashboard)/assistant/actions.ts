"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import { handleAssistantTurn } from "@/application/assistant/assistant-service";
import { createAIInteraction } from "@/infrastructure/database/repositories/ai-interaction-repository";
import {
  createConversationForUser,
  deleteConversationForUser,
} from "@/infrastructure/database/repositories/conversation-repository";

function getFieldValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getOptionalFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);

  if (!(value instanceof File)) {
    return null;
  }

  if (value.size === 0) {
    return null;
  }

  return value;
}

export type SendAssistantMessageActionResult =
  | {
      ok: true;
      conversationId: string;
      assistantMessage: string;
      requiresConfirmation: boolean;
    }
  | {
      ok: false;
      error: string;
      conversationId?: string;
    };

export async function createAssistantConversationAction() {
  const currentUser = await requireCurrentUser();

  const conversation = await createConversationForUser(currentUser.id, "Nueva conversacion");
  revalidatePath("/assistant");
  redirect(`/assistant?conversationId=${conversation.id}`);
}

export async function sendAssistantMessageAction(
  formData: FormData,
): Promise<SendAssistantMessageActionResult> {
  const currentUser = await requireCurrentUser();
  const startedAt = Date.now();

  const conversationId = getFieldValue(formData, "conversationId") || undefined;
  const userMessage = getFieldValue(formData, "message");
  const imageFile = getOptionalFile(formData, "image");
  let result: Awaited<ReturnType<typeof handleAssistantTurn>>;

  try {
    result = await handleAssistantTurn({
      userId: currentUser.id,
      conversationId,
      userMessage,
      imageFile,
    });
  } catch {
    try {
      await createAIInteraction({
        userId: currentUser.id,
        operation: "assistant.turn.error",
        model: "assistant-orchestrator",
        latencyMs: Date.now() - startedAt,
        success: false,
      });
    } catch {
      // Avoid blocking chat UX if telemetry storage fails.
    }

    return {
      ok: false,
      error: "No pude completar la consulta anterior. Intenta de nuevo en unos segundos.",
      conversationId,
    };
  }

  revalidatePath("/assistant");

  return {
    ok: true,
    conversationId: result.conversationId,
    assistantMessage: result.assistantMessage,
    requiresConfirmation: result.requiresConfirmation,
  };
}

export async function deleteAssistantConversationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const conversationId = getFieldValue(formData, "conversationId");

  if (!conversationId) {
    revalidatePath("/assistant");
    redirect("/assistant?status=error");
  }

  try {
    await deleteConversationForUser(conversationId, currentUser.id);
  } catch {
    revalidatePath("/assistant");
    redirect("/assistant?status=error");
  }

  revalidatePath("/assistant");
  redirect("/assistant");
}
