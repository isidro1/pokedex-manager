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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-semibold text-slate-900">Crear cuenta</h1>
      <p className="mt-2 text-sm text-slate-600">
        Registra tu usuario para iniciar tu coleccion personal de Pokemon.
      </p>

      <form onSubmit={handleRegister} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Inicia sesion
        </Link>
      </p>
    </main>
  );
}