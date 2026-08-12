import { PrismaClient } from "@prisma/client";

const LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/pokedex_manager?schema=public";

const normalizedDatabaseUrl = process.env.DATABASE_URL?.trim();

if (!normalizedDatabaseUrl && process.env.NODE_ENV !== "production") {
  // Some shells export DATABASE_URL as an empty string, which breaks Prisma resolution.
  process.env.DATABASE_URL = LOCAL_DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasRequiredDelegates(client: PrismaClient): boolean {
  const runtimeClient = client as unknown as Record<string, unknown>;
  return typeof runtimeClient.pokemonAIInsight === "object";
}

function resolvePrismaClient(): PrismaClient {
  const cachedClient = globalForPrisma.prisma;

  if (!cachedClient) {
    return createPrismaClient();
  }

  if (hasRequiredDelegates(cachedClient)) {
    return cachedClient;
  }

  void cachedClient.$disconnect().catch(() => undefined);
  return createPrismaClient();
}

export const prisma = resolvePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}