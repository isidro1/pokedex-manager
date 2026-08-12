export type ConversationMessageRole = "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";

export interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: Date;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: ConversationMessageRole;
  content: string;
  createdAt: Date;
}
