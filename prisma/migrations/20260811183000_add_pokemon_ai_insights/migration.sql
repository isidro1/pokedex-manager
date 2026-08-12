-- CreateTable
CREATE TABLE "public"."PokemonAIInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "insights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PokemonAIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PokemonAIInsight_userId_pokemonId_createdAt_idx" ON "public"."PokemonAIInsight"("userId", "pokemonId", "createdAt");

-- CreateIndex
CREATE INDEX "PokemonAIInsight_userId_createdAt_idx" ON "public"."PokemonAIInsight"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."PokemonAIInsight" ADD CONSTRAINT "PokemonAIInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
