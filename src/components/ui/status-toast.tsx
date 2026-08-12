"use client";

import { useEffect } from "react";

type StatusToastTone = "success" | "error" | "info";

type StatusToastProps = {
  title: string;
  message: string;
  tone: StatusToastTone;
  open: boolean;
  onClose: () => void;
  autoHideMs?: number;
};

function getToneClassNames(tone: StatusToastTone): string {
  if (tone === "success") {
    return "border-emerald-300 bg-emerald-50 text-emerald-950";
  }

  if (tone === "error") {
    return "border-rose-300 bg-rose-50 text-rose-950";
  }

  return "border-sky-300 bg-sky-50 text-sky-950";
}

export function StatusToast({
  title,
  message,
  tone,
  open,
  onClose,
  autoHideMs = 2800,
}: StatusToastProps) {
  useEffect(() => {
    if (!open || autoHideMs <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, autoHideMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoHideMs, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 w-[min(92vw,22rem)] rounded-xl border p-3 shadow-lg backdrop-blur-sm sm:right-6 sm:top-6"
    >
      <div className={`rounded-lg border px-3 py-2 ${getToneClassNames(tone)}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-sm">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-current/30 px-2 py-1 text-xs font-medium hover:bg-black/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </aside>
  );
}
