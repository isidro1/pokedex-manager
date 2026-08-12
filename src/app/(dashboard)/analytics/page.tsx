import { generateAIPokemonInsights } from "@/application/analytics/generate-ai-collection-insights";
import { getObjectiveCollectionAnalytics } from "@/application/analytics/get-objective-collection-analytics";
import {
  recommendPokemonByTypeForCollection,
  recommendPokemonForCollection,
} from "@/application/analytics/recommend-pokemon-for-collection";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import { getCollectionByUserId } from "@/application/collection/collection-service";
import { getAIInteractionOverview } from "@/infrastructure/database/repositories/ai-interaction-repository";
import {
  listLatestPokemonInsightsByUser,
} from "@/infrastructure/database/repositories/pokemon-ai-insight-repository";
import { AnalyticsTabsPanel } from "@/components/analytics/analytics-tabs-panel";

type AnalyticsPageProps = {
  searchParams?: Promise<{
    pokemonId?: string;
    runInsight?: string;
    openReport?: string;
  }>;
};

function parseSelectedPokemonId(rawValue?: string): number | null {
  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function parseBooleanFlag(rawValue?: string): boolean {
  return rawValue === "1" || rawValue === "true";
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const currentUser = await requireCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedPokemonId = parseSelectedPokemonId(resolvedSearchParams?.pokemonId);
  const shouldRunInsight = parseBooleanFlag(resolvedSearchParams?.runInsight);
  const shouldOpenStoredReport = parseBooleanFlag(resolvedSearchParams?.openReport);
  const collectionItems = await getCollectionByUserId(currentUser.id);

  if (collectionItems.length === 0) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">Analítica IA</h1>
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
          Aun no hay datos para analizar. Agrega Pokemon a tu coleccion y vuelve aqui.
        </p>
      </section>
    );
  }

  const objectiveAnalytics = getObjectiveCollectionAnalytics(collectionItems);
  const focusMissingType = objectiveAnalytics.missingTypes[0] ?? null;
  const collectionPokemonById = new Map<number, NonNullable<(typeof collectionItems)[number]["pokemon"]>>();

  for (const item of collectionItems) {
    if (!item.pokemon) {
      continue;
    }

    if (!collectionPokemonById.has(item.pokemon.id)) {
      collectionPokemonById.set(item.pokemon.id, item.pokemon);
    }
  }

  const collectionPokemon = [...collectionPokemonById.values()];

  const [generalRecommendations, typeRecommendations, aiMcpActivity] = await Promise.all([
    recommendPokemonForCollection(currentUser.id, 3, collectionItems).catch(() => []),
    focusMissingType
      ? recommendPokemonByTypeForCollection({
          userId: currentUser.id,
          type: focusMissingType,
          count: 3,
          preloadedCollection: collectionItems,
        }).catch(() => [])
      : Promise.resolve([]),
    getAIInteractionOverview(currentUser.id, { days: 14, limit: 250 }).catch(() => null),
  ]);

  const pokemonById = new Map<number, NonNullable<(typeof collectionItems)[number]["pokemon"]>>();

  for (const item of collectionItems) {
    if (item.pokemon) {
      pokemonById.set(item.pokemon.id, item.pokemon);
    }
  }

  for (const pokemon of generalRecommendations) {
    if (!pokemonById.has(pokemon.id)) {
      pokemonById.set(pokemon.id, pokemon);
    }
  }

  for (const pokemon of typeRecommendations) {
    if (!pokemonById.has(pokemon.id)) {
      pokemonById.set(pokemon.id, pokemon);
    }
  }

  const latestPokemonInsights = await listLatestPokemonInsightsByUser(currentUser.id).catch(() => []);

  for (const insight of latestPokemonInsights) {
    if (!pokemonById.has(insight.pokemonId)) {
      pokemonById.set(insight.pokemonId, insight.pokemon);
    }
  }

  const pokemonIdsWithInsightsSet = new Set(latestPokemonInsights.map((insight) => insight.pokemonId));
  let recentAnalyzedPokemon = latestPokemonInsights.slice(0, 6).map((insight) => insight.pokemon);

  const selectedPokemon = selectedPokemonId ? pokemonById.get(selectedPokemonId) ?? null : null;
  const selectedStoredInsight = selectedPokemonId
    ? latestPokemonInsights.find((insight) => insight.pokemonId === selectedPokemonId) ?? null
    : null;

  let aiInsights: Awaited<ReturnType<typeof generateAIPokemonInsights>>["insights"] | null = null;
  let aiError: string | null = null;
  let hasSelectedStoredInsight = false;

  if (selectedStoredInsight) {
    hasSelectedStoredInsight = true;
    aiInsights = selectedStoredInsight.insights;
  }

  if (selectedPokemon && shouldRunInsight) {
    try {
      const generationResult = await generateAIPokemonInsights({
        pokemon: selectedPokemon,
        analytics: objectiveAnalytics,
        userId: currentUser.id,
      });
      aiInsights = generationResult.insights;

      if (generationResult.persisted) {
        hasSelectedStoredInsight = true;
        pokemonIdsWithInsightsSet.add(selectedPokemon.id);
        recentAnalyzedPokemon = [selectedPokemon, ...recentAnalyzedPokemon.filter((pokemon) => pokemon.id !== selectedPokemon.id)]
          .slice(0, 6);
      } else {
        aiError = "Se genero el analisis IA, pero no fue posible guardarlo en la base de datos.";
      }
    } catch {
      aiError = "No fue posible generar insights IA para el Pokemon seleccionado.";
    }
  }

  const shouldAutoOpenReport =
    (shouldRunInsight || shouldOpenStoredReport) && Boolean(selectedPokemon && (aiInsights || aiError));

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-4">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">Analítica</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Analítica IA</h1>
        <p className="mt-2 text-slate-600">
          Secciones separadas en tabs para evitar ruido visual. El informe IA aparece en modal al analizar una carta.
        </p>
      </header>

      <AnalyticsTabsPanel
        key={`${selectedPokemonId ?? "none"}-${shouldRunInsight ? "run" : "view"}`}
        objectiveAnalytics={objectiveAnalytics}
        collectionPokemon={collectionPokemon}
        generalRecommendations={generalRecommendations}
        typeRecommendations={typeRecommendations}
        recentAnalyzedPokemon={recentAnalyzedPokemon}
        focusMissingType={focusMissingType}
        aiMcpActivity={aiMcpActivity}
        selectedPokemon={selectedPokemon}
        selectedPokemonId={selectedPokemonId}
        pokemonIdsWithInsights={[...pokemonIdsWithInsightsSet]}
        hasSelectedStoredInsight={hasSelectedStoredInsight}
        aiInsights={aiInsights}
        aiError={aiError}
        autoOpenReport={shouldAutoOpenReport}
      />
    </section>
  );
}
