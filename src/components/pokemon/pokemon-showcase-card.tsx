import Image from "next/image";
import type { ReactNode } from "react";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { PokemonTypePill } from "@/components/pokemon/pokemon-type-pill";

type PokemonShowcaseCardProps = {
  pokemon: Pokemon;
  headerNote?: string;
  footer?: ReactNode;
  children?: ReactNode;
  showCuriosity?: boolean;
};

function buildPokemonCuriosity(pokemon: Pokemon): string {
  const abilities = pokemon.abilities ?? [];
  const primaryType = pokemon.types[0];

  if (pokemon.types.length >= 2) {
    return `Combina ${pokemon.types[0]} y ${pokemon.types[1]}, util para estrategias mixtas.`;
  }

  if (primaryType && abilities.length > 0) {
    return `Pokemon de tipo ${primaryType} con habilidad destacada ${abilities[0]}.`;
  }

  return "Revisa sus stats en combate para descubrir su mejor rol en equipo.";
}

function formatMeasure(value?: number): string {
  if (value === undefined) {
    return "N/A";
  }

  return `${value.toFixed(1)}`;
}

export function PokemonShowcaseCard({
  pokemon,
  headerNote,
  footer,
  children,
  showCuriosity = true,
}: PokemonShowcaseCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {headerNote ? <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{headerNote}</p> : null}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:h-24 sm:w-24">
          <Image
            src={pokemon.artworkUrl ?? pokemon.spriteUrl ?? "/favicon.ico"}
            alt={`Imagen de ${pokemon.name}`}
            width={96}
            height={96}
            unoptimized
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">#{pokemon.id}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 capitalize">{pokemon.name}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pokemon.types.map((type) => (
              <PokemonTypePill key={`${pokemon.id}-${type}`} type={type} />
            ))}
            {pokemon.types.length === 0 ? <span className="text-xs text-slate-500">Sin tipos</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Altura</p>
          <p className="font-semibold">{formatMeasure(pokemon.heightM)} m</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Peso</p>
          <p className="font-semibold">{formatMeasure(pokemon.weightKg)} kg</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Exp Base</p>
          <p className="font-semibold">{pokemon.baseExperience ?? "N/A"}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Habilidades</p>
        <p className="mt-1 text-sm text-slate-700">
          {(pokemon.abilities ?? []).slice(0, 3).join(", ") || "N/A"}
        </p>
      </div>

      {showCuriosity ? (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900">
          <p className="font-semibold">Curiosidad</p>
          <p className="mt-1">{buildPokemonCuriosity(pokemon)}</p>
        </div>
      ) : null}

      {children ? <div className="mt-3">{children}</div> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </article>
  );
}
