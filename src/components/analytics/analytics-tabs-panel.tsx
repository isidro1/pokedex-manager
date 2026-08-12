"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { AIInteractionOverview } from "@/domain/ai/ai-interaction-overview";
import type { AICollectionInsights, ObjectiveCollectionAnalytics } from "@/domain/ai/collection-insights";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { PokemonShowcaseCard } from "@/components/pokemon/pokemon-showcase-card";
import { MetricTile } from "@/components/ui/metric-tile";

type TabKey = "resumen" | "recomendaciones" | "actividad";

type AnalyticsTabsPanelProps = {
  objectiveAnalytics: ObjectiveCollectionAnalytics;
  collectionPokemon: Pokemon[];
  generalRecommendations: Pokemon[];
  typeRecommendations: Pokemon[];
  recentAnalyzedPokemon: Pokemon[];
  focusMissingType: string | null;
  aiMcpActivity: AIInteractionOverview | null;
  selectedPokemon: Pokemon | null;
  selectedPokemonId: number | null;
  pokemonIdsWithInsights: number[];
  hasSelectedStoredInsight: boolean;
  aiInsights: AICollectionInsights | null;
  aiError: string | null;
  autoOpenReport?: boolean;
};

function formatOperationLabel(value: string): string {
  return value.replace(/[_.]/g, " ");
}

function buildAnalyzeHref(pokemonId: number): string {
  return `/analytics?pokemonId=${pokemonId}&runInsight=1`;
}

function buildViewHref(pokemonId: number): string {
  return `/analytics?pokemonId=${pokemonId}&openReport=1`;
}

export function AnalyticsTabsPanel({
  objectiveAnalytics,
  collectionPokemon,
  generalRecommendations,
  typeRecommendations,
  recentAnalyzedPokemon,
  focusMissingType,
  aiMcpActivity,
  selectedPokemon,
  selectedPokemonId,
  pokemonIdsWithInsights,
  hasSelectedStoredInsight,
  aiInsights,
  aiError,
  autoOpenReport = false,
}: AnalyticsTabsPanelProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [pendingPokemonId, setPendingPokemonId] = useState<number | null>(null);
  const hasReportData = Boolean(selectedPokemon && (aiInsights || aiError));
  const pokemonIdsWithInsightsSet = new Set(pokemonIdsWithInsights);
  const analyzedPokemonIds = new Set(recentAnalyzedPokemon.map((pokemon) => pokemon.id));
  const generalRecommendationsToRender = generalRecommendations.filter(
    (pokemon) => !analyzedPokemonIds.has(pokemon.id),
  );
  const typeRecommendationsToRender = typeRecommendations.filter(
    (pokemon) => !analyzedPokemonIds.has(pokemon.id),
  );
  const recommendationCardIds = [
    ...new Set(
      [...recentAnalyzedPokemon, ...generalRecommendationsToRender, ...typeRecommendationsToRender].map(
        (pokemon) => pokemon.id,
      ),
    ),
  ];
  const storedInsightsInViewCount = recommendationCardIds.filter((pokemonId) =>
    pokemonIdsWithInsightsSet.has(pokemonId),
  ).length;
  const [activeTab, setActiveTab] = useState<TabKey>(autoOpenReport ? "recomendaciones" : "resumen");
  const [isReportOpen, setIsReportOpen] = useState(autoOpenReport && hasReportData);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const hasTransientParams =
      currentUrl.searchParams.has("pokemonId") ||
      currentUrl.searchParams.has("runInsight") ||
      currentUrl.searchParams.has("openReport");

    if (!hasTransientParams) {
      return;
    }

    window.history.replaceState(window.history.state, "", "/analytics");
  }, []);

  function handleAnalyzePokemon(pokemonId: number): void {
    setPendingPokemonId(pokemonId);
    startNavigation(() => {
      router.push(buildAnalyzeHref(pokemonId));
    });
  }

  function handleViewPokemonInsight(pokemonId: number): void {
    startNavigation(() => {
      router.push(buildViewHref(pokemonId));
    });
  }

  function buildCardAction(pokemon: Pokemon): ReactNode {
    const isSelectedCard = selectedPokemonId !== null && selectedPokemonId === pokemon.id;
    const hasStoredInsight = pokemonIdsWithInsightsSet.has(pokemon.id);
    const canRegenerate = hasStoredInsight || (isSelectedCard && hasSelectedStoredInsight);
    const isAnalyzingCurrent = isNavigating && pendingPokemonId === pokemon.id;

    if (isSelectedCard && hasReportData) {
      return (
        <div className="flex flex-col gap-2">
          {hasStoredInsight ? (
            <span className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Analisis guardado
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
          >
            Ver analisis IA
          </button>
          {canRegenerate ? (
            <button
              type="button"
              onClick={() => handleAnalyzePokemon(pokemon.id)}
              disabled={isAnalyzingCurrent}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAnalyzingCurrent ? "Generando nuevo analisis..." : "Generar nuevo analisis"}
            </button>
          ) : null}
        </div>
      );
    }

    if (hasStoredInsight) {
      return (
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Analisis guardado
          </span>
          <button
            type="button"
            onClick={() => handleViewPokemonInsight(pokemon.id)}
            className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
          >
            Ver analisis IA
          </button>
          <button
            type="button"
            onClick={() => handleAnalyzePokemon(pokemon.id)}
            disabled={isAnalyzingCurrent}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAnalyzingCurrent ? "Generando nuevo analisis..." : "Generar nuevo analisis"}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleAnalyzePokemon(pokemon.id)}
        disabled={isAnalyzingCurrent}
        className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isAnalyzingCurrent ? "Analizando IA..." : "Analizar IA"}
      </button>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("resumen")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm ${
              activeTab === "resumen"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Resumen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recomendaciones")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm ${
              activeTab === "recomendaciones"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Recomendaciones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("actividad")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm ${
              activeTab === "actividad"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Actividad IA/MCP
          </button>

          {isNavigating && pendingPokemonId !== null ? (
            <span className="ml-auto rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 sm:text-sm">
              Procesando analisis IA...
            </span>
          ) : null}
        </div>
      </section>

      {activeTab === "resumen" ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Datos objetivos</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Total Pokemon" value={objectiveAnalytics.totalPokemon} />
            <MetricTile label="Total unidades" value={objectiveAnalytics.totalUnits} />
            <MetricTile label="Duplicados" value={objectiveAnalytics.duplicateEntries} />
            <MetricTile label="Diversidad" value={`${objectiveAnalytics.diversityScore}%`} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Tipos mas representados</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {objectiveAnalytics.topTypes.map((item) => (
                  <li key={item.type} className="rounded-lg border border-slate-200 px-3 py-2">
                    {item.type}: {item.count}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Tipos menos representados</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {objectiveAnalytics.leastTypes.map((item) => (
                  <li key={item.type} className="rounded-lg border border-slate-200 px-3 py-2">
                    {item.type}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-800">Recomendaciones deterministicas</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {objectiveAnalytics.deterministicRecommendations.map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          </div>
        </article>
      ) : null}

      {activeTab === "recomendaciones" ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Recomendaciones en formato carta</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si la carta ya tiene historial, usa Ver analisis IA o Generar nuevo analisis.
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-700">
            Cartas con analisis guardado en pantalla: {storedInsightsInViewCount}
          </p>

          <div className="mt-4 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Pokemon de tu coleccion</h3>
              <p className="mt-1 text-xs text-slate-600">
                Se actualiza cada vez que recargas esta pagina. Puedes analizar cualquiera de tus Pokemon desde aqui.
              </p>
              {collectionPokemon.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No hay Pokemon disponibles en tu coleccion para analizar.
                </p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {collectionPokemon.map((pokemon) => (
                    <PokemonShowcaseCard
                      key={`analytics-collection-${pokemon.id}`}
                      pokemon={pokemon}
                      headerNote="Guardado en tu coleccion"
                      showCuriosity={false}
                      footer={buildCardAction(pokemon)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Ya analizados</h3>
              {recentAnalyzedPokemon.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  Aun no tienes analisis IA guardados.
                </p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {recentAnalyzedPokemon.map((pokemon) => (
                    <PokemonShowcaseCard
                      key={`analytics-reviewed-${pokemon.id}`}
                      pokemon={pokemon}
                      headerNote="Analizado previamente"
                      showCuriosity={false}
                      footer={buildCardAction(pokemon)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Sugerencias generales</h3>
              {generalRecommendationsToRender.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No hay recomendaciones generales nuevas por ahora. Esto puede pasar si ya cubres
                  bien los tipos faltantes o esas sugerencias ya fueron analizadas.
                </p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {generalRecommendationsToRender.map((pokemon) => (
                    <PokemonShowcaseCard
                      key={`analytics-general-${pokemon.id}`}
                      pokemon={pokemon}
                      headerNote="Recomendado por cobertura"
                      showCuriosity={false}
                      footer={buildCardAction(pokemon)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {focusMissingType
                  ? `Sugerencias de tipo ${focusMissingType}`
                  : "Sugerencias por tipo faltante"}
              </h3>
              {typeRecommendationsToRender.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                  No hay sugerencias de tipo nuevas en este momento. Puedes usar las cartas de tu
                  coleccion para generar analisis IA igualmente.
                </p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {typeRecommendationsToRender.map((pokemon) => (
                    <PokemonShowcaseCard
                      key={`analytics-type-${pokemon.id}`}
                      pokemon={pokemon}
                      headerNote="Recomendado por tipo"
                      showCuriosity={false}
                      footer={buildCardAction(pokemon)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      ) : null}

      {activeTab === "actividad" ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h2 className="text-base font-semibold text-emerald-950">Actividad IA y MCP (Prisma)</h2>
          <p className="mt-1 text-sm text-emerald-900/80">
            Telemetria de los ultimos 14 dias capturada desde la tabla AIInteraction.
          </p>

          {!aiMcpActivity ? (
            <p className="mt-3 text-sm text-emerald-900">No fue posible cargar actividad IA/MCP.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile
                  label="Ejecuciones IA"
                  value={aiMcpActivity.totalRuns}
                  className="bg-white/90"
                />
                <MetricTile
                  label="Exito"
                  value={`${aiMcpActivity.successRate}%`}
                  className="bg-white/90"
                />
                <MetricTile
                  label="Latencia media"
                  value={aiMcpActivity.averageLatencyMs !== null ? `${aiMcpActivity.averageLatencyMs} ms` : "N/A"}
                  className="bg-white/90"
                />
                <MetricTile
                  label="Llamadas MCP"
                  value={aiMcpActivity.totalToolCalls}
                  className="bg-white/90"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-950">Operaciones mas usadas</h3>
                  <ul className="mt-2 space-y-2 text-sm text-emerald-950">
                    {aiMcpActivity.topOperations.map((item) => (
                      <li key={item.operation} className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                        <span className="capitalize">{formatOperationLabel(item.operation)}</span>: {item.count}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-emerald-950">Modelos usados</h3>
                  <ul className="mt-2 space-y-2 text-sm text-emerald-950">
                    {aiMcpActivity.modelUsage.map((item) => (
                      <li key={item.model} className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                        {item.model}: {item.count}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </article>
      ) : null}

      {isReportOpen && selectedPokemon ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Informe IA de Pokemon"
          onClick={() => setIsReportOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Informe IA</h2>
                <p className="text-xs text-slate-500">
                  #{selectedPokemon.id} {selectedPokemon.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/analytics"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </Link>
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
            </header>

            <div className="space-y-4 p-4 text-sm text-slate-800">
              {aiError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{aiError}</p>
              ) : null}

              {aiInsights ? (
                <>
                  <p>{aiInsights.summary}</p>

                  <div>
                    <h3 className="font-semibold">Sugerencias</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {aiInsights.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold">Curiosidades</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {aiInsights.curiosities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <p>
                    <span className="font-semibold">Idea de comparacion:</span> {aiInsights.comparisonIdea}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
