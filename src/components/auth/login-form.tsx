"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  ensureFirebaseAuthPersistence,
  getFirebaseAuth,
} from "@/infrastructure/firebase/firebase-client";

type LoginFormProps = {
  redirectTo: string;
};

async function persistSession(idToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    let errorMessage = "No se pudo guardar la sesion";
    let errorCode: string | null = null;

    try {
      const payload = (await response.json()) as { message?: string; code?: string };
      if (payload.message) {
        errorMessage = payload.message;
      }

      if (payload.code) {
        errorCode = payload.code;
      }
    } catch {
      // Keep a safe generic message if backend payload is not JSON.
    }

    if (errorCode) {
      throw new Error(`${errorMessage} (${errorCode})`);
    }

    throw new Error(errorMessage);
  }
}

function getFirebaseAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
        return "Se cerro la ventana de Google antes de completar el inicio. Intenta de nuevo.";
      case "auth/popup-blocked":
        return "El navegador bloqueo la ventana de Google. Habilita popups para continuar.";
      case "auth/network-request-failed":
        return "No se pudo conectar al servicio de autenticacion. Revisa tu conexion.";
      case "auth/operation-not-allowed":
        return "Google Sign-In no esta habilitado en Firebase para este proyecto.";
      case "auth/unauthorized-domain":
        return "El dominio actual no esta autorizado en Firebase Authentication.";
      case "auth/account-exists-with-different-credential":
        return "Ya existe una cuenta con este email usando otro metodo de inicio de sesion.";
      case "auth/invalid-credential":
        return "Google devolvio una credencial invalida. Intenta nuevamente.";
      default:
        return `${fallback} (codigo: ${error.code})`;
    }
  }

  if (error instanceof Error) {
    // Map unstable SDK/browser wording to a deterministic UI message.
    if (/database|hidden|closed/i.test(error.message)) {
      return `${fallback} (referencia: GOOGLE_SDK_STATE_CONFLICT)`;
    }

    if (error.message.trim().length > 0) {
      return error.message;
    }
  }

  return fallback;
}

function shouldFallbackToRedirect(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    return false;
  }

  return (
    error.code === "auth/popup-blocked" ||
    error.code === "auth/popup-closed-by-user" ||
    error.code === "auth/cancelled-popup-request"
  );
}

function isSdkStateConflictError(error: unknown): boolean {
  return error instanceof Error && /database|hidden|closed/i.test(error.message);
}

async function recoverFirebaseClientState(): Promise<void> {
  const auth = getFirebaseAuth();

  try {
    await signOut(auth);
  } catch {
    // Best effort only. Continue with persistence setup fallback.
  }

  await ensureFirebaseAuthPersistence(auth);
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreRedirectSession() {
      try {
        const auth = getFirebaseAuth();
        await ensureFirebaseAuthPersistence(auth);
        const redirectCredential = await getRedirectResult(auth);

        if (!redirectCredential) {
          return;
        }

        if (isMounted) {
          setIsLoading(true);
          setError(null);
        }

        const idToken = await redirectCredential.user.getIdToken(true);
        await persistSession(idToken);

        router.push(redirectTo);
        router.refresh();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isSdkStateConflictError(error)) {
          await recoverFirebaseClientState();
          return;
        }

        setError(
          getFirebaseAuthErrorMessage(
            error,
            "No se pudo completar el inicio de sesion con Google.",
          ),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreRedirectSession();

    return () => {
      isMounted = false;
    };
  }, [redirectTo, router]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      await ensureFirebaseAuthPersistence(auth);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken(true);

      await persistSession(idToken);

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setError(
        getFirebaseAuthErrorMessage(
          error,
          "No se pudo iniciar sesion. Verifica tus credenciales.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      await ensureFirebaseAuthPersistence(auth);
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken(true);

      try {
        await persistSession(idToken);
      } catch (sessionError) {
        setError(
          getFirebaseAuthErrorMessage(
            sessionError,
            "Google autentico correctamente, pero no se pudo crear la sesion en el servidor.",
          ),
        );
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      if (shouldFallbackToRedirect(error) || isSdkStateConflictError(error)) {
        const auth = getFirebaseAuth();
        await recoverFirebaseClientState();
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }

      setError(getFirebaseAuthErrorMessage(error, "No se pudo iniciar sesion con Google."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-semibold text-slate-900">Iniciar sesion</h1>
      <p className="mt-2 text-sm text-slate-600">
        Accede para gestionar tu coleccion y usar las funciones de IA.
      </p>

      <form
        onSubmit={handleEmailLogin}
        className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-slate-600 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Contrasena</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-slate-600 focus:outline-none"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Procesando..." : "Entrar con email"}
        </button>
      </form>

      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleLogin}
        className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Procesando..." : "Entrar con Google"}
      </button>

      <p className="mt-6 text-sm text-slate-600">
        No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-slate-900 underline">
          Registrate
        </Link>
      </p>
    </main>
  );
}