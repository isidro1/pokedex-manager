"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  idleText: string;
  pendingText: string;
  className: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmActionText?: string;
  cancelText?: string;
};

export function ConfirmSubmitButton({
  idleText,
  pendingText,
  className,
  confirmTitle,
  confirmDescription,
  confirmActionText = "Confirmar",
  cancelText = "Cancelar",
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusOnCloseRef = useRef(true);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current && restoreFocusOnCloseRef.current) {
        triggerRef.current?.focus();
      }

      restoreFocusOnCloseRef.current = true;
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;

    const previousModalOpenFlag = document.body.dataset.confirmModalOpen;
    const previousOverflow = document.body.style.overflow;
    document.body.dataset.confirmModalOpen = "1";
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    const handleFocusIn = (event: FocusEvent) => {
      const modalElement = modalRef.current;
      if (!modalElement) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!modalElement.contains(target)) {
        cancelRef.current?.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = [cancelRef.current, confirmRef.current].filter(
        (element): element is HTMLButtonElement => Boolean(element),
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (previousModalOpenFlag === undefined) {
        delete document.body.dataset.confirmModalOpen;
      } else {
        document.body.dataset.confirmModalOpen = previousModalOpenFlag;
      }
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleConfirmSubmit(): void {
    const form = triggerRef.current?.form;
    if (!form || pending) {
      return;
    }

    restoreFocusOnCloseRef.current = false;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsOpen(false);
    form.requestSubmit();
  }

  function openModal(): void {
    if (pending) {
      return;
    }

    restoreFocusOnCloseRef.current = true;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsOpen(true);
  }

  function closeModal(): void {
    setIsOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        onClick={openModal}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? pendingText : idleText}
      </button>

      {isOpen ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={confirmTitle}
          onClick={closeModal}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">{confirmTitle}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{confirmDescription}</p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {cancelText}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={handleConfirmSubmit}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                {confirmActionText}
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </>
  );
}
