import { getServerEnv } from "@/lib/env/server-env";
import { AuthenticationError } from "@/lib/errors/application-errors";
import type { AuthIdentity } from "@/domain/user/user";

type DecodedFirebaseToken = {
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

type FirebaseAdminAuth = {
  verifyIdToken: (
    idToken: string,
    checkRevoked?: boolean,
  ) => Promise<DecodedFirebaseToken>;
};

type IdentityToolkitResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
    emailVerified?: boolean;
  }>;
};

let firebaseAdminAuthPromise: Promise<FirebaseAdminAuth | null> | null = null;

async function getFirebaseAdminAuthOrNull(): Promise<FirebaseAdminAuth | null> {
  const env = getServerEnv();

  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  const firebaseClientEmail = env.FIREBASE_CLIENT_EMAIL;
  const firebasePrivateKey = env.FIREBASE_PRIVATE_KEY;
  const firebaseProjectId = env.FIREBASE_PROJECT_ID;

  if (firebaseAdminAuthPromise) {
    return firebaseAdminAuthPromise;
  }

  firebaseAdminAuthPromise = (async () => {
    try {
      const [{ cert, getApps, initializeApp }, { getAuth }] = await Promise.all([
        import("firebase-admin/app"),
        import("firebase-admin/auth"),
      ]);

      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: firebaseProjectId,
            clientEmail: firebaseClientEmail,
            privateKey: firebasePrivateKey.replace(/\\n/g, "\n"),
          }),
          projectId: firebaseProjectId,
        });
      }

      return getAuth() as unknown as FirebaseAdminAuth;
    } catch {
      return null;
    }
  })();

  return firebaseAdminAuthPromise;
}

async function verifyWithIdentityToolkit(idToken: string): Promise<AuthIdentity> {
  const env = getServerEnv();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new AuthenticationError("No se pudo validar el token de Firebase");
  }

  const payload = (await response.json()) as IdentityToolkitResponse;
  const user = payload.users?.[0];

  if (!user?.localId || !user.email) {
    throw new AuthenticationError("Token de Firebase invalido");
  }

  return {
    firebaseUid: user.localId,
    email: user.email,
    displayName: user.displayName ?? null,
    photoUrl: user.photoUrl ?? null,
    emailVerified: user.emailVerified ?? false,
  };
}

export async function verifyFirebaseToken(idToken: string): Promise<AuthIdentity> {
  const adminAuth = await getFirebaseAdminAuthOrNull();

  if (adminAuth) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken, true);
      if (!decodedToken.uid || !decodedToken.email) {
        throw new AuthenticationError("Token de Firebase invalido");
      }

      return {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name ?? null,
        photoUrl: decodedToken.picture ?? null,
        emailVerified: Boolean(decodedToken.email_verified),
      };
    } catch {
      // If Admin SDK validation fails (project mismatch/misconfigured credentials),
      // fallback to Firebase Identity Toolkit to keep auth flow operational.
      return verifyWithIdentityToolkit(idToken);
    }
  }

  return verifyWithIdentityToolkit(idToken);
}