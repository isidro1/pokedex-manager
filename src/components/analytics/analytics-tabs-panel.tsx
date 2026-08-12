"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { AIInteractionOverview } from "@/domain/ai/ai-interaction-overview";
import type { AICollectionInsights, ObjectiveCollectionAnalytics } from "@/domain/ai/collection-insights";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { PokemonShowcaseCard } from "@/components/pokemon/pokemon-showcase-card";
import { MetricTile } from "@/components/ui/metric-tile";

type TabKey = "resumen" | "recomendaciones" | "comparador" | "actividad";

type ComparisonSide = "left" | "right" | "tie";

type ComparisonRow = {
  label: string;
  leftValue: string;
  rightValue: string;
  winner: ComparisonSide;
  hint: string;
};

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

function findWinnerByNumericMetric(
  leftValue: number | null,
  rightValue: number | null,
): ComparisonSide {
  if (leftValue === rightValue) {
    return "tie";
  }

  if (leftValue === null) {
    return rightValue === null ? "tie" : "right";
  }

  if (rightValue === null) {
    return "left";
  }

  return leftValue > rightValue ? "left" : "right";
}

function formatMaybeNumber(value: number | null, suffix = ""): string {
  if (value === null) {
    return "N/A";
  }

  return `${value}${suffix}`;
}

function calculateVersatilityScore(pokemon: Pokemon, missingTypesSet: Set<string>): number {
  const typeCoverageScore = pokemon.types.length * 25;
  const abilityCoverageScore = (pokemon.abilities?.length ?? 0) * 8;
  const experienceScore = Math.round((pokemon.baseExperience ?? 0) / 5);
  const missingTypeCoverageBonus = pokemon.types.reduce((total, type) => {
    return missingTypesSet.has(type.toLowerCase()) ? total + 35 : total;
  }, 0);

  return typeCoverageScore + abilityCoverageScore + experienceScore + missingTypeCoverageBonus;
}

function getWinnerBadgeClass(side: ComparisonSide): string {
  if (side === "left") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (side === "right") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getWinnerBadgeLabel(side: ComparisonSide): string {
  if (side === "left") {
    return "Gana A";
  }

  if (side === "right") {
    return "Gana B";
  }

  return "Empate";
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
  const [leftPokemonId, setLeftPokemonId] = useState<number | null>(null);
  const [rightPokemonId, setRightPokemonId] = useState<number | null>(null);

  const comparisonCandidates = useMemo(() => {
    const merged = [
      ...collectionPokemon,
      ...recentAnalyzedPokemon,
      ...generalRecommendationsToRender,
      ...typeRecommendationsToRender,
    ];
    const uniqueById = new Map<number, Pokemon>();

    for (const pokemon of merged) {
      if (!uniqueById.has(pokemon.id)) {
        uniqueById.set(pokemon.id, pokemon);
      }
    }

    return [...uniqueById.values()];
  }, [
    collectionPokemon,
    recentAnalyzedPokemon,
    generalRecommendationsToRender,
    typeRecommendationsToRender,
  ]);

  const resolvedLeftPokemonId =
    leftPokemonId !== null && comparisonCandidates.some((pokemon) => pokemon.id === leftPokemonId)
      ? leftPokemonId
      : comparisonCandidates[0]?.id ?? null;

  const resolvedRightPokemonId =
    rightPokemonId !== null &&
    comparisonCandidates.some((pokemon) => pokemon.id === rightPokemonId) &&
    rightPokemonId !== resolvedLeftPokemonId
      ? rightPokemonId
      : comparisonCandidates.find((pokemon) => pokemon.id !== resolvedLeftPokemonId)?.id ?? null;

  const leftPokemon =
    resolvedLeftPokemonId !== null
      ? comparisonCandidates.find((pokemon) => pokemon.id === resolvedLeftPokemonId) ?? null
      : null;
  const rightPokemon =
    resolvedRightPokemonId !== null
      ? comparisonCandidates.find((pokemon) => pokemon.id === resolvedRightPokemonId) ?? null
      : null;

  const missingTypesSet = useMemo(
    () => new Set(objectiveAnalytics.missingTypes.map((item) => item.toLowerCase())),
    [objectiveAnalytics.missingTypes],
  );

  const leftTypeCount = leftPokemon?.types.length ?? 0;
  const rightTypeCount = rightPokemon?.types.length ?? 0;
  const leftAbilityCount = leftPokemon?.abilities?.length ?? 0;
  const rightAbilityCount = rightPokemon?.abilities?.length ?? 0;
  const leftBaseExperience = leftPokemon?.baseExperience ?? null;
  const rightBaseExperience = rightPokemon?.baseExperience ?? null;
  const leftMissingCoverage =
    leftPokemon?.types.reduce(
      (total, type) => (missingTypesSet.has(type.toLowerCase()) ? total + 1 : total),
      0,
    ) ?? 0;
  const rightMissingCoverage =
    rightPokemon?.types.reduce(
      (total, type) => (missingTypesSet.has(type.toLowerCase()) ? total + 1 : total),
      0,
    ) ?? 0;
  const leftVersatilityScore =
    leftPokemon !== null ? calculateVersatilityScore(leftPokemon, missingTypesSet) : null;
  const rightVersatilityScore =
    rightPokemon !== null ? calculateVersatilityScore(rightPokemon, missingTypesSet) : null;

  const comparisonRows: ComparisonRow[] =
    leftPokemon && rightPokemon
      ? [
          {
            label: "Cobertura de tipos",
            leftValue: String(leftTypeCount),
            rightValue: String(rightTypeCount),
            winner: findWinnerByNumericMetric(leftTypeCount, rightTypeCount),
            hint: "Mas tipos suele dar mayor flexibilidad en equipo.",
          },
          {
            label: "Variedad de habilidades",
            leftValue: String(leftAbilityCount),
            rightValue: String(rightAbilityCount),
            winner: findWinnerByNumericMetric(leftAbilityCount, rightAbilityCount),
            hint: "Mas habilidades amplia opciones tacticas.",
          },
          {
            label: "Cubre tipos faltantes",
            leftValue: String(leftMissingCoverage),
            rightValue: String(rightMissingCoverage),
            winner: findWinnerByNumericMetric(leftMissingCoverage, rightMissingCoverage),
            hint: "Prioriza quien reduce vacios de tu coleccion.",
          },
          {
            label: "Experiencia base",
            leftValue: formatMaybeNumber(leftBaseExperience),
            rightValue: formatMaybeNumber(rightBaseExperience),
            winner: findWinnerByNumericMetric(leftBaseExperience, rightBaseExperience),
            hint: "Sirve como proxy rapido de potencial general.",
          },
          {
            label: "Indice de versatilidad",
            leftValue: formatMaybeNumber(leftVersatilityScore),
            rightValue: formatMaybeNumber(rightVersatilityScore),
            winner: findWinnerByNumericMetric(leftVersatilityScore, rightVersatilityScore),
            hint: "Combina tipos, habilidades, experiencia y cobertura faltante.",
          },
        ]
      : [];

  const comparisonWinner = findWinnerByNumericMetric(leftVersatilityScore, rightVersatilityScore);
  const sharedTypes =
    leftPokemon && rightPokemon
      ? leftPokemon.types.filter((type) => rightPokemon.types.includes(type))
      : [];
  const sharedAbilities =
    leftPokemon && rightPokemon
      ? (leftPokemon.abilities ?? []).filter((ability) =>
          (rightPokemon.abilities ?? []).includes(ability),
        )
      : [];

  const comparisonTakeaways: string[] = [];

  if (leftPokemon && rightPokemon) {
    if (sharedTypes.length > 0) {
      comparisonTakeaways.push(`Comparten tipo(s): ${sharedTypes.join(", ")}.`);
    } else {
      comparisonTakeaways.push("No comparten tipos: buena opcion para comparar roles complementarios.");
    }

    if (sharedAbilities.length > 0) {
      comparisonTakeaways.push(`Comparten habilidad(es): ${sharedAbilities.join(", ")}.`);
    }

    if (leftMissingCoverage !== rightMissingCoverage) {
      const betterCoverageName =
        leftMissingCoverage > rightMissingCoverage ? leftPokemon.name : rightPokemon.name;
      comparisonTakeaways.push(
        `${betterCoverageName} aporta mejor cobertura de tipos faltantes para tu coleccion.`,
      );
    }

    if (comparisonWinner === "left") {
      comparisonTakeaways.push(`Recomendacion actual: priorizar ${leftPokemon.name} en esta comparativa.`);
    } else if (comparisonWinner === "right") {
      comparisonTakeaways.push(`Recomendacion actual: priorizar ${rightPokemon.name} en esta comparativa.`);
    } else {
      comparisonTakeaways.push("Resultado parejo: ambos tienen valor similar segun los datos actuales.");
    }
  }

  function handleLeftSelection(nextPokemonId: number): void {
    setLeftPokemonId(nextPokemonId);

    if (resolvedRightPokemonId === nextPokemonId) {
      const fallback = comparisonCandidates.find((pokemon) => pokemon.id !== nextPokemonId);
      setRightPokemonId(fallback?.id ?? null);
    }
  }

  function handleRightSelection(nextPokemonId: number): void {
    setRightPokemonId(nextPokemonId);

    if (resolvedLeftPokemonId === nextPokemonId) {
      const fallback = comparisonCandidates.find((pokemon) => pokemon.id !== nextPokemonId);
      setLeftPokemonId(fallback?.id ?? null);
    }
  }

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
            onClick={() => setActiveTab("comparador")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm ${
              activeTab === "comparador"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Comparador
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

      {activeTab === "comparador" ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Comparativas inteligentes entre Pokemon (1 vs 1)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Selecciona dos Pokemon para compararlos en vivo por cobertura de tipos, habilidades,
            experiencia base y aporte a tu coleccion.
          </p>

          {comparisonCandidates.length < 2 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
              Necesitas al menos dos Pokemon para usar el comparador interactivo.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block font-semibold text-slate-800">Pokemon A</span>
                  <select
                    value={resolvedLeftPokemonId ?? ""}
                    onChange={(event) => handleLeftSelection(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    {comparisonCandidates.map((pokemon) => (
                      <option key={`left-${pokemon.id}`} value={pokemon.id}>
                        #{pokemon.id} {pokemon.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-700">
                  <span className="mb-1 block font-semibold text-slate-800">Pokemon B</span>
                  <select
                    value={resolvedRightPokemonId ?? ""}
                    onChange={(event) => handleRightSelection(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    {comparisonCandidates
                      .filter((pokemon) => pokemon.id !== resolvedLeftPokemonId)
                      .map((pokemon) => (
                        <option key={`right-${pokemon.id}`} value={pokemon.id}>
                          #{pokemon.id} {pokemon.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {leftPokemon && rightPokemon ? (
                <>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <PokemonShowcaseCard
                      pokemon={leftPokemon}
                      headerNote="Comparativa · Pokemon A"
                      showCuriosity={false}
                    />
                    <PokemonShowcaseCard
                      pokemon={rightPokemon}
                      headerNote="Comparativa · Pokemon B"
                      showCuriosity={false}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {comparisonRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                          <p className="text-xs text-slate-500">{row.hint}</p>
                        </div>
                        <p className="rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-800">{row.leftValue}</p>
                        <p className="rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-800">{row.rightValue}</p>
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${getWinnerBadgeClass(row.winner)}`}
                        >
                          {getWinnerBadgeLabel(row.winner)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                    <p className="text-xs font-semibold tracking-wide text-indigo-900 uppercase">
                      Veredicto inteligente
                    </p>
                    <p className="mt-1 text-sm text-indigo-900">
                      {comparisonWinner === "left"
                        ? `${leftPokemon.name} toma ventaja por su indice de versatilidad.`
                        : comparisonWinner === "right"
                          ? `${rightPokemon.name} toma ventaja por su indice de versatilidad.`
                          : "Empate tecnico: ambos Pokemon tienen un perfil competitivo similar."}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-indigo-900">
                      {comparisonTakeaways.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </>
          )}
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
