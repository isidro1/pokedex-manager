import Link from "next/link";
import { addCollectionItemAction } from "@/app/(dashboard)/collection/actions";
import {
  searchPokemonInPokedex,
  searchPokemonNameSuggestionsInPokedex,
} from "@/application/collection/collection-service";
import { PokedexSearchForm } from "@/components/pokedex/pokedex-search-form";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { searchPokemonSchema } from "@/schemas/collection-schemas";
import { PokemonShowcaseCard } from "@/components/pokemon/pokemon-showcase-card";

type PokedexPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function PokedexPage({ searchParams }: PokedexPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";

  let searchResults: Awaited<ReturnType<typeof searchPokemonInPokedex>> = [];
  let querySuggestions: string[] = [];

  if (query.length >= 2) {
    const validation = searchPokemonSchema.safeParse({ q: query });
    if (validation.success) {
      [searchResults, querySuggestions] = await Promise.all([
        searchPokemonInPokedex(validation.data.q),
        searchPokemonNameSuggestionsInPokedex(validation.data.q, 8),
      ]);
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">Catalogo</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">PokeDex</h1>
        <p className="mt-2 text-slate-600">Busca Pokemon por nombre o ID y agregalos a tu coleccion.</p>
        <p className="mt-1 text-sm text-slate-500">
          Si prefieres interactuar en modo chat, usa el
          {" "}
          <Link href="/assistant" className="font-medium text-slate-700 underline">
            Asistente IA
          </Link>
          .
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Datos mostrados desde PokéAPI: imagen oficial, tipos, habilidades, altura, peso y experiencia base.
        </p>
      </header>

      <PokedexSearchForm
        key={query.length > 0 ? query : "empty-query"}
        initialQuery={query}
        initialSuggestions={querySuggestions}
      />

      {query.length > 0 && query.length < 2 ? (
        <p className="text-sm text-slate-600">Ingresa al menos 2 caracteres para buscar.</p>
      ) : null}

      {query.length >= 2 && searchResults.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
          No se encontraron Pokemon para &quot;{query}&quot;.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {searchResults.map((pokemon) => (
          <PokemonShowcaseCard
            key={pokemon.id}
            pokemon={pokemon}
            footer={(
              <div className="flex items-center justify-between gap-3">
                <Link href="/collection" className="text-sm font-medium text-slate-700 underline">
                  Ver coleccion
                </Link>

                <form action={addCollectionItemAction}>
                  <input type="hidden" name="pokemonId" value={pokemon.id} />
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="source" value="MANUAL" />
                  <FormSubmitButton
                    idleText="Agregar"
                    pendingText="Agregando..."
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800"
                  />
                </form>
              </div>
            )}
          />
        ))}
      </section>
    </section>
  );
}