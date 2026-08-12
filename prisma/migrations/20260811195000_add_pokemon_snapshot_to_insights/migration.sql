-- AlterTable
ALTER TABLE "public"."PokemonAIInsight"
  ADD COLUMN "pokemonName" TEXT,
  ADD COLUMN "pokemonTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "spriteUrl" TEXT,
  ADD COLUMN "artworkUrl" TEXT;

-- CreateIndex
CREATE INDEX "PokemonAIInsight_userId_pokemonId_idx" ON "public"."PokemonAIInsight"("userId", "pokemonId");
