"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getClientEnv } from "@/lib/env/client-env";

let authPersistenceReadyPromise: Promise<void> | null = null;

function getFirebaseApp() {
  const env = getClientEnv();

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function ensureFirebaseAuthPersistence(auth: Auth): Promise<void> {
  if (authPersistenceReadyPromise) {
    return authPersistenceReadyPromise;
  }

  authPersistenceReadyPromise = (async () => {
    const persistenceCandidates = [
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence,
    ];

    for (const persistence of persistenceCandidates) {
      try {
        await setPersistence(auth, persistence);
        return;
      } catch {
        // Try the next strategy. Some browsers reject IndexedDB/local storage contexts.
      }
    }

    throw new Error("No se pudo configurar la persistencia de Firebase Auth");
  })();

  try {
    await authPersistenceReadyPromise;
  } catch (error) {
    authPersistenceReadyPromise = null;
    throw error;
  }
}