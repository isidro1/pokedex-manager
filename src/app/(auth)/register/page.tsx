"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  ensureFirebaseAuthPersistence,
  getFirebaseAuth,
} from "@/infrastructure/firebase/firebase-client";

async function persistSession(idToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error("No se pudo guardar la sesion");
  }
}

function getFirebaseRegisterErrorMessage(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;

  if (code === "auth/operation-not-allowed") {
    return "Registro con email/contrasena no habilitado en Firebase. Activa Email/Password en Authentication > Sign-in method.";
  }

  if (code === "auth/email-already-in-use") {
    return "Ese correo ya esta registrado. Inicia sesion o usa otro correo.";
  }

  if (code === "auth/invalid-email") {
    return "El correo no es valido.";
  }

  if (code === "auth/weak-password") {
    return "La contrasena es muy debil. Usa al menos 6 caracteres.";
  }

  if (code === "auth/network-request-failed") {
    return "No se pudo conectar con Firebase. Revisa tu red e intenta de nuevo.";
  }

  return "No se pudo crear la cuenta. Verifica los datos ingresados.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      await ensureFirebaseAuthPersistence(auth);
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName.trim()) {
        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });
      }

      const idToken = await credential.user.getIdToken(true);
      await persistSession(idToken);

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(getFirebaseRegisterErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_84%_78%,rgba(99,102,241,0.1),transparent_38%)]" />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Nuevo usuario</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Crear cuenta</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Crea tu cuenta para guardar tu coleccion, recibir analisis IA y usar el asistente con contexto.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Persistencia por usuario con PostgreSQL</li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Recomendaciones inteligentes basadas en tu coleccion</li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Comparador Pokemon vs Pokemon en Analitica</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:p-7">
          <form onSubmit={handleRegister} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">Nombre visible (opcional)</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-slate-600 focus:outline-none"
              />
            </label>
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
                minLength={6}
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
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-slate-900 underline">
              Inicia sesion
            </Link>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Tus datos se usan solo para autenticacion y personalizacion de la experiencia.
          </p>
        </section>
      </div>
    </main>
  );
}