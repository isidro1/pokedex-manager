import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  POKE_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
});

type ServerEnv = Omit<z.infer<typeof serverEnvSchema>, "FIREBASE_PROJECT_ID"> & {
  FIREBASE_PROJECT_ID: string;
  POKE_API_BASE_URL: string;
};

let cachedServerEnv: ServerEnv | null = null;

function normalizeValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsedEnv = serverEnvSchema.parse({
    DATABASE_URL: normalizeValue(process.env.DATABASE_URL),
    POKE_API_BASE_URL: normalizeValue(process.env.POKE_API_BASE_URL),
    NEXT_PUBLIC_FIREBASE_API_KEY: normalizeValue(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: normalizeValue(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    FIREBASE_PROJECT_ID: normalizeValue(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: normalizeValue(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: normalizeValue(process.env.FIREBASE_PRIVATE_KEY),
    GEMINI_API_KEY: normalizeValue(process.env.GEMINI_API_KEY),
  });

  cachedServerEnv = {
    ...parsedEnv,
    POKE_API_BASE_URL: parsedEnv.POKE_API_BASE_URL ?? "https://pokeapi.co/api/v2",
    FIREBASE_PROJECT_ID:
      parsedEnv.FIREBASE_PROJECT_ID ?? parsedEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  return cachedServerEnv;
}