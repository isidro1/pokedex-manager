"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PokedexSearchFormProps = {
  initialQuery: string;
  initialSuggestions: string[];
};

type SuggestionsResponse = {
  suggestions?: string[];
};

export function PokedexSearchForm({
  initialQuery,
  initialSuggestions,
}: PokedexSearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions);
  const visibleSuggestions = query.trim().length >= 2 ? suggestions : [];

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      fetch(`/api/pokedex/suggestions?q=${encodeURIComponent(normalizedQuery)}`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) {
            return [];
          }

          const payload = (await response.json()) as SuggestionsResponse;
          return Array.isArray(payload.suggestions) ? payload.suggestions : [];
        })
        .then((nextSuggestions) => {
          setSuggestions(nextSuggestions);
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, 160);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <form action="/pokedex" method="GET" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Buscar</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: pikachu o 25"
            list={visibleSuggestions.length > 0 ? "pokemon-name-suggestions" : undefined}
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
          <datalist id="pokemon-name-suggestions">
            {visibleSuggestions.map((name) => (
              <option key={`autocomplete-${name}`} value={name} />
            ))}
          </datalist>
          <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white sm:w-auto">
            Buscar
          </button>
        </div>
      </label>

      {visibleSuggestions.length > 0 ? (
        <p className="mt-3 text-xs text-slate-600">
          Sugerencias: {visibleSuggestions.map((name, index) => (
            <span key={`suggestion-${name}`}>
              {index > 0 ? " · " : ""}
              <Link href={`/pokedex?q=${encodeURIComponent(name)}`} className="text-slate-700 underline">
                {name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </form>
  );
}
