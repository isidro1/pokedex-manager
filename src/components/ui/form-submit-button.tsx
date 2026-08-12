"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  idleText: string;
  pendingText: string;
  className: string;
  icon?: ReactNode;
};

export function FormSubmitButton({
  idleText,
  pendingText,
  className,
  icon,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {icon}
      {pending ? pendingText : idleText}
    </button>
  );
}
