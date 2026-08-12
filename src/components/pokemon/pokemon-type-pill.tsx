type PokemonTypePillProps = {
  type: string;
};

export function PokemonTypePill({ type }: PokemonTypePillProps) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 capitalize">
      {type}
    </span>
  );
}
