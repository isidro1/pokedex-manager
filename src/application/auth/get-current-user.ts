import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@/domain/user/user";
import { verifyFirebaseToken } from "@/infrastructure/firebase/firebase-server-auth";
import {
  findUserByFirebaseUid,
  upsertUserByFirebaseIdentity,
} from "@/infrastructure/database/repositories/user-repository";

export const AUTH_SESSION_COOKIE_NAME = "pokedex_session";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const identity = await verifyFirebaseToken(sessionCookie);
    const existingUser = await findUserByFirebaseUid(identity.firebaseUid);

    if (!existingUser) {
      return upsertUserByFirebaseIdentity(identity);
    }

    const hasDrift =
      existingUser.email !== identity.email ||
      existingUser.displayName !== identity.displayName ||
      existingUser.photoUrl !== identity.photoUrl;

    if (hasDrift) {
      return upsertUserByFirebaseIdentity(identity);
    }

    return existingUser;
  } catch {
    return null;
  }
}

export async function requireCurrentUser(): Promise<User> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
}