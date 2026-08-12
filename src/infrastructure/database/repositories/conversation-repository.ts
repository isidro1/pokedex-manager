import { MessageRole } from "@prisma/client";
import type {
  ConversationMessage,
  ConversationSummary,
} from "@/domain/conversation/conversation";
import { NotFoundError } from "@/lib/errors/application-errors";
import { prisma } from "@/infrastructure/database/prisma";

export async function listConversationsByUserId(userId: string): Promise<ConversationSummary[]> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    messageCount: conversation._count.messages,
  }));
}

export async function createConversationForUser(
  userId: string,
  title: string | null,
): Promise<ConversationSummary> {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title,
    },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    messageCount: conversation._count.messages,
  };
}

export async function ensureConversationBelongsToUser(
  conversationId: string,
  userId: string,
): Promise<void> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    throw new NotFoundError("Conversacion no encontrada");
  }
}

export async function listConversationMessages(
  conversationId: string,
  userId: string,
): Promise<ConversationMessage[]> {
  await ensureConversationBelongsToUser(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export async function addConversationMessage(input: {
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
}): Promise<ConversationMessage> {
  await ensureConversationBelongsToUser(input.conversationId, input.userId);

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    },
  });

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}

export async function deleteConversationForUser(
  conversationId: string,
  userId: string,
): Promise<void> {
  await ensureConversationBelongsToUser(conversationId, userId);

  await prisma.$transaction([
    prisma.message.deleteMany({
      where: { conversationId },
    }),
    prisma.conversation.delete({
      where: { id: conversationId },
    }),
  ]);
}
