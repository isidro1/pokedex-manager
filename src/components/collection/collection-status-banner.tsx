"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StatusToast } from "@/components/ui/status-toast";

type CollectionStatus = "added" | "updated" | "deleted" | "error";

type StatusView = {
  title: string;
  message: string;
  tone: "success" | "error";
  autoHideMs?: number;
};

function toKnownStatus(value?: string): CollectionStatus | null {
  if (value === "added" || value === "updated" || value === "deleted" || value === "error") {
    return value;
  }

  return null;
}

function getStatusView(status: CollectionStatus): StatusView {
  if (status === "added") {
    return {
      title: "Coleccion actualizada",
      message: "Pokemon agregado a tu colección.",
      tone: "success",
      autoHideMs: 2600,
    };
  }

  if (status === "updated") {
    return {
      title: "Coleccion actualizada",
      message: "Item actualizado correctamente.",
      tone: "success",
      autoHideMs: 2600,
    };
  }

  if (status === "deleted") {
    return {
      title: "Coleccion actualizada",
      message: "Item eliminado de la colección.",
      tone: "success",
      autoHideMs: 2600,
    };
  }

  return {
    title: "Operacion no completada",
    message: "No se pudo completar la operación.",
    tone: "error",
    autoHideMs: 4500,
  };
}

export function CollectionStatusBanner({ status }: { status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const knownStatus = toKnownStatus(status);
  const view = useMemo(() => {
    return knownStatus ? getStatusView(knownStatus) : null;
  }, [knownStatus]);
  const [isOpen, setIsOpen] = useState(Boolean(view));

  useEffect(() => {
    setIsOpen(Boolean(view));
  }, [view]);

  function clearStatusInUrl(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");

    // Keep error code when present so collection page can keep contextual UI behavior.
    if (knownStatus !== "error") {
      params.delete("code");
    }

    const query = params.toString();
    const nextUrl = query.length > 0 ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  function handleClose(): void {
    setIsOpen(false);
    clearStatusInUrl();
  }

  if (!view || !isOpen) {
    return null;
  }

  return (
    <StatusToast
      title={view.title}
      message={view.message}
      tone={view.tone}
      open={isOpen}
      onClose={handleClose}
      autoHideMs={view.autoHideMs}
    />
  );
}
