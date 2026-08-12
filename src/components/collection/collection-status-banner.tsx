"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type CollectionStatus = "added" | "updated" | "deleted" | "error";

type StatusView = {
  message: string;
  tone: "success" | "error";
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
      message: "Pokemon agregado a tu colección.",
      tone: "success",
    };
  }

  if (status === "updated") {
    return {
      message: "Item actualizado correctamente.",
      tone: "success",
    };
  }

  if (status === "deleted") {
    return {
      message: "Item eliminado de la colección.",
      tone: "success",
    };
  }

  return {
    message: "No se pudo completar la operación.",
    tone: "error",
  };
}

export function CollectionStatusBanner({ status }: { status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [view] = useState<StatusView | null>(() => {
    const knownStatus = toKnownStatus(status);
    return knownStatus ? getStatusView(knownStatus) : null;
  });

  useEffect(() => {
    const knownStatus = toKnownStatus(status);

    // Keep error params because they carry useful context (e.g., add_failed).
    if (!knownStatus || knownStatus === "error") {
      return;
    }

    router.replace(pathname, { scroll: false });
  }, [pathname, router, status]);

  if (!view) {
    return null;
  }

  const className =
    view.tone === "success"
      ? "rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      : "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900";

  return <p className={className}>{view.message}</p>;
}
