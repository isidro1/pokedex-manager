import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import {
  listConversationMessages,
  listConversationsByUserId,
} from "@/infrastructure/database/repositories/conversation-repository";
import {
  createAssistantConversationAction,
  deleteAssistantConversationAction,
  sendAssistantMessageAction,
} from "@/app/(dashboard)/assistant/actions";
import { AssistantChatPanel } from "@/components/assistant/assistant-chat-panel";
import { MCPHelpModal } from "@/components/assistant/mcp-help-modal";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { listMcpTools } from "@/infrastructure/mcp/mcp-server";
import { getAIInteractionOverview } from "@/infrastructure/database/repositories/ai-interaction-repository";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

function readConversationId(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const value = searchParams.conversationId;

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return null;
}

function readStatus(
  searchParams: Record<string, string | string[] | undefined>,
): "error" | null {
  const value = searchParams.status;
  if (value === "error") {
    return "error";
  }

  return null;
}

function formatTimestamp(value: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function AssistantPage({ searchParams }: PageProps) {
  const currentUser = await requireCurrentUser();
  const resolvedSearchParams = await searchParams;
  const selectedConversationId = readConversationId(resolvedSearchParams);
  const pageStatus = readStatus(resolvedSearchParams);

  const conversations = await listConversationsByUserId(currentUser.id);
  const mcpTools = listMcpTools();
  const aiMcpActivity = await getAIInteractionOverview(currentUser.id, { days: 14, limit: 500 }).catch(
    () => null,
  );

  const effectiveConversationId = selectedConversationId ?? conversations[0]?.id ?? null;

  if (selectedConversationId && !conversations.some((item) => item.id === selectedConversationId)) {
    notFound();
  }

  const messages = effectiveConversationId
    ? await listConversationMessages(effectiveConversationId, currentUser.id)
    : [];
  const visibleMessages = messages.filter(
    (message) => message.role === "USER" || message.role === "ASSISTANT",
  );
  const chatMessages: ChatMessage[] = visibleMessages.map((message) => ({
    id: message.id,
    role: message.role === "USER" ? "USER" : "ASSISTANT",
    content: message.content,
  }));

  return (
    <section className="space-y-6">
      <header className="space-y-2 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-yellow-50 to-blue-50 p-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Asistente IA Pokemon</h1>
        <p className="text-sm text-slate-700">
          Consulta tu coleccion, busca Pokemon y ejecuta acciones seguras con confirmacion
          para operaciones destructivas.
        </p>
      </header>

      <MCPHelpModal tools={mcpTools} activity={aiMcpActivity} />

      {pageStatus === "error" ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          No pude completar la consulta anterior. Intenta de nuevo en unos segundos.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:max-h-[70vh] lg:overflow-y-auto">
          <form action={createAssistantConversationAction}>
            <button
              type="submit"
              className="mb-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Nueva conversacion
            </button>
          </form>

          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                No tienes conversaciones todavia.
              </p>
            ) : (
              conversations.map((conversation) => {
                const isActive = conversation.id === effectiveConversationId;
                return (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-2 rounded-md border px-2 py-2 transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-muted"
                    }`}
                  >
                    <Link
                      href={`/assistant?conversationId=${conversation.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-medium">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.updatedAt)}
                      </p>
                    </Link>

                    <form action={deleteAssistantConversationAction} className="shrink-0">
                      <input type="hidden" name="conversationId" value={conversation.id} />
                      <ConfirmSubmitButton
                        idleText="Eliminar"
                        pendingText="Eliminando..."
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        confirmTitle="Eliminar conversacion"
                        confirmDescription={`Se eliminara la conversacion \"${conversation.title}\" con todos sus mensajes.`}
                        confirmActionText="Si, eliminar"
                      />
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <AssistantChatPanel
          key={effectiveConversationId ?? "new-conversation"}
          conversationId={effectiveConversationId}
          messages={chatMessages}
          userAvatar={{
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoUrl: currentUser.photoUrl,
          }}
          sendMessageAction={sendAssistantMessageAction}
        />
      </div>
    </section>
  );
}
