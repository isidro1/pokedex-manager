"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

type AssistantVisibleMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type PendingSyncState = {
  baseCount: number;
  userContent: string;
  assistantContent: string | null;
};

type UserAvatar = {
  displayName: string | null;
  email: string;
  photoUrl: string | null;
};

type AssistantChatPanelProps = {
  conversationId: string | null;
  messages: AssistantVisibleMessage[];
  userAvatar: UserAvatar;
  sendMessageAction: (formData: FormData) => Promise<
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
      }
  >;
};

function initialsFromUser(userAvatar: UserAvatar): string {
  const base = userAvatar.displayName?.trim() || userAvatar.email;
  return base.slice(0, 1).toUpperCase();
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar"}
    </button>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function shouldBlockComposerFocus(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.body.dataset.confirmModalOpen === "1";
}

export function AssistantChatPanel({
  conversationId,
  messages,
  userAvatar,
  sendMessageAction,
}: AssistantChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const firstRenderRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [localMessages, setLocalMessages] = useState<AssistantVisibleMessage[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);
  const [pendingSync, setPendingSync] = useState<PendingSyncState | null>(null);

  const pendingServerMessages = pendingSync
    ? messages.slice(pendingSync.baseCount)
    : [];

  const userPersisted = pendingSync
    ? pendingServerMessages.some(
        (message) => message.role === "USER" && message.content === pendingSync.userContent,
      )
    : false;

  const assistantPersisted = pendingSync && pendingSync.assistantContent
    ? pendingServerMessages.some(
        (message) =>
          message.role === "ASSISTANT" && message.content === pendingSync.assistantContent,
      )
    : false;

  const reconciledLocalMessages = localMessages.filter((message) => {
    if (!pendingSync) {
      return true;
    }

    if (
      message.role === "USER" &&
      message.content === pendingSync.userContent &&
      userPersisted
    ) {
      return false;
    }

    if (
      message.role === "ASSISTANT" &&
      message.content === pendingSync.assistantContent &&
      assistantPersisted
    ) {
      return false;
    }

    return true;
  });

  const visibleMessages = [...messages, ...reconciledLocalMessages];
  const showThinking = isAwaitingResponse;

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const behavior = firstRenderRef.current ? "auto" : "smooth";
    element.scrollTo({ top: element.scrollHeight, behavior });
    firstRenderRef.current = false;
  }, [visibleMessages.length, showThinking, activeConversationId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAwaitingResponse) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const messageValue = formData.get("message");
    const imageValue = formData.get("image");
    const normalizedMessage = typeof messageValue === "string" ? messageValue.trim() : "";
    const hasImage = imageValue instanceof File && imageValue.size > 0;

    if (!normalizedMessage && !hasImage) {
      return;
    }

    if (activeConversationId) {
      formData.set("conversationId", activeConversationId);
    }

    const optimisticContent = normalizedMessage || "Analiza la imagen adjunta";
    setSubmitError(null);
    setLocalMessages([
      {
        id: `local-user-${Date.now()}`,
        role: "USER",
        content: optimisticContent,
      },
    ]);
    setPendingSync({
      baseCount: messages.length,
      userContent: optimisticContent,
      assistantContent: null,
    });
    setIsAwaitingResponse(true);
    formRef.current?.reset();
    setSelectedFileName(null);
    setSelectedFileSize(null);
    if (!shouldBlockComposerFocus()) {
      textareaRef.current?.focus();
    }

    try {
      const result = await sendMessageAction(formData);

      if (!result.ok) {
        setSubmitError(result.error ?? "No pude completar la consulta anterior.");
        return;
      }

      if (result.conversationId) {
        setActiveConversationId(result.conversationId);
      }

      if (result.assistantMessage) {
        setLocalMessages((current) => [
          ...current,
          {
            id: `local-assistant-${Date.now()}`,
            role: "ASSISTANT",
            content: result.assistantMessage,
          },
        ]);
        setPendingSync((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            assistantContent: result.assistantMessage,
          };
        });
      }
    } catch {
      setSubmitError("No pude completar la consulta anterior. Intenta de nuevo en unos segundos.");
      setLocalMessages([]);
      setPendingSync(null);
    } finally {
      setIsAwaitingResponse(false);
      if (!shouldBlockComposerFocus()) {
        textareaRef.current?.focus();
      }
    }
  }

  const userInitial = initialsFromUser(userAvatar);

  function handleAttachButtonClick(): void {
    if (isAwaitingResponse) {
      return;
    }

    fileInputRef.current?.click();
  }

  function handleFileChange(): void {
    const file = fileInputRef.current?.files?.[0] ?? null;

    if (!file) {
      setSelectedFileName(null);
      setSelectedFileSize(null);
      return;
    }

    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
  }

  function clearAttachedFile(): void {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.value = "";
    setSelectedFileName(null);
    setSelectedFileSize(null);
  }

  return (
    <div className="flex h-[72vh] min-h-[420px] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm sm:min-h-[520px] lg:min-h-[560px]">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {visibleMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            Escribe una pregunta para empezar. Ejemplos: &quot;muestrame mi coleccion&quot;,
            &quot;busca char&quot;, &quot;que Pokemon me recomiendas&quot;.
          </div>
        ) : (
          visibleMessages.map((message) => {
            const isUser = message.role === "USER";

            return (
              <article
                key={message.id}
                className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {isUser ? null : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-xs font-bold text-white"
                    aria-label="Avatar del asistente"
                    title="Asistente IA"
                  >
                    AI
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%] ${
                    isUser
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {isUser ? (
                  userAvatar.photoUrl ? (
                    <div
                      className="h-9 w-9 shrink-0 rounded-full border border-slate-200 bg-cover bg-center"
                      style={{ backgroundImage: `url(${userAvatar.photoUrl})` }}
                      aria-label="Tu foto de perfil"
                      title="Tu perfil"
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700"
                      aria-label="Tu avatar"
                      title="Tu perfil"
                    >
                      {userInitial}
                    </div>
                  )
                ) : null}
              </article>
            );
          })
        )}

        {showThinking ? (
          <article className="flex items-end gap-2 justify-start">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-xs font-bold text-white"
              aria-label="Avatar del asistente"
              title="Asistente IA"
            >
              AI
            </div>

            <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm sm:max-w-[78%]">
              <p className="animate-pulse">Pensando...</p>
            </div>
          </article>
        ) : null}
      </div>

      <form id="assistant-composer" ref={formRef} onSubmit={handleSubmit} className="space-y-3 border-t border-slate-200 bg-white p-2.5 sm:p-3">
        <input type="hidden" name="conversationId" value={activeConversationId ?? ""} />

        <label className="block text-xs font-medium text-slate-600" htmlFor="message">
          Mensaje
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="message"
            name="message"
            rows={3}
            placeholder="Preguntame sobre tu coleccion. Puedes adjuntar una imagen con el clip."
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-12 py-3 pr-28 text-sm text-slate-900 outline-none ring-slate-300/70 placeholder:text-slate-400 focus:ring-2"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <button
            type="button"
            onClick={handleAttachButtonClick}
            disabled={isAwaitingResponse}
            className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Adjuntar imagen"
            title="Adjuntar imagen"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.49a4 4 0 115.66 5.66l-8.5 8.49a2 2 0 01-2.82-2.82l7.78-7.78" />
            </svg>
          </button>

          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <SubmitButton pending={isAwaitingResponse} />
          </div>
        </div>

        {submitError ? (
          <p className="text-xs text-red-600">{submitError}</p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          disabled={isAwaitingResponse}
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFileName ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700">
              {selectedFileName}
              {selectedFileSize !== null ? ` (${formatFileSize(selectedFileSize)})` : ""}
            </span>
            <button
              type="button"
              onClick={clearAttachedFile}
              disabled={isAwaitingResponse}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Quitar
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">Imagen opcional: JPG, PNG o WEBP hasta 5MB.</p>
        )}
      </form>
    </div>
  );
}
