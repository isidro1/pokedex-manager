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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-2 3.1l3.2 2.5c1.9-1.8 3-4.4 3-7.6 0-.8-.1-1.5-.2-2.2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-0.9 6.7-2.4l-3.2-2.5c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.7C4.6 19.9 8 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.2 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.5H2.9C2.3 8.8 2 10.3 2 12s.3 3.2.9 4.5l3.3-2.7z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 2.9 14.7 2 12 2 8 2 4.6 4.1 2.9 7.5l3.3 2.7c.8-2.5 3.1-4.3 5.8-4.3z"
      />
    </svg>
  );
}

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
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_85%_75%,rgba(16,185,129,0.12),transparent_38%)]" />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Bienvenido</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Iniciar sesion</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Accede para gestionar tu coleccion, analizar Pokemon con IA y recibir recomendaciones personalizadas.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Coleccion personal con ownership</li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Identificacion desde imagen con Gemini Vision</li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Asistente IA con herramientas MCP</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:p-7">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{isLoading ? "Procesando..." : "Continuar con Google"}</span>
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>o entra con email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
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
              className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Procesando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-slate-900 underline">
              Registrate
            </Link>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Al continuar aceptas los terminos de uso y politica de privacidad de la plataforma.
          </p>
        </section>
      </div>
    </main>
  );
}