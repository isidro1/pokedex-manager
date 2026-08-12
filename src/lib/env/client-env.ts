import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;

let cachedClientEnv: ClientEnv | null = null;

function normalizeValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) {
    return cachedClientEnv;
  }

  cachedClientEnv = clientEnvSchema.parse({
    NEXT_PUBLIC_FIREBASE_API_KEY: normalizeValue(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    ),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: normalizeValue(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: normalizeValue(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    NEXT_PUBLIC_FIREBASE_APP_ID: normalizeValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  });

  return cachedClientEnv;
}