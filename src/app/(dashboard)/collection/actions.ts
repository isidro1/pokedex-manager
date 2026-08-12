"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import {
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/application/collection/collection-service";
import {
  addCollectionItemSchema,
  deleteCollectionItemSchema,
  updateCollectionItemSchema,
} from "@/schemas/collection-schemas";

function toFieldValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function buildSearchParams(input: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    params.set(key, value);
  }

  return params.toString();
}

export async function addCollectionItemAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  let redirectUrl = "/collection?status=added";

  try {
    const payload = addCollectionItemSchema.parse({
      pokemonId: toFieldValue(formData, "pokemonId"),
      quantity: toFieldValue(formData, "quantity") ?? "1",
      nickname: toFieldValue(formData, "nickname"),
      notes: toFieldValue(formData, "notes"),
      source: toFieldValue(formData, "source") ?? "MANUAL",
    });

    await createCollectionItem({
      userId: currentUser.id,
      ...payload,
    });

    revalidatePath("/collection");
  } catch {
    const params = buildSearchParams({ status: "error", code: "add_failed" });
    redirectUrl = `/collection?${params}`;
  }

  redirect(redirectUrl);
}

export async function updateCollectionItemAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  let redirectUrl = "/collection?status=updated";

  try {
    const payload = updateCollectionItemSchema.parse({
      itemId: toFieldValue(formData, "itemId"),
      quantity: toFieldValue(formData, "quantity"),
      nickname: toFieldValue(formData, "nickname"),
      notes: toFieldValue(formData, "notes"),
    });

    await updateCollectionItem({
      userId: currentUser.id,
      ...payload,
    });

    revalidatePath("/collection");
  } catch {
    const params = buildSearchParams({ status: "error", code: "update_failed" });
    redirectUrl = `/collection?${params}`;
  }

  redirect(redirectUrl);
}

export async function deleteCollectionItemAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  let redirectUrl = "/collection?status=deleted";

  try {
    const payload = deleteCollectionItemSchema.parse({
      itemId: toFieldValue(formData, "itemId"),
    });

    await deleteCollectionItem(payload.itemId, currentUser.id);

    revalidatePath("/collection");
  } catch {
    const params = buildSearchParams({ status: "error", code: "delete_failed" });
    redirectUrl = `/collection?${params}`;
  }

  redirect(redirectUrl);
}