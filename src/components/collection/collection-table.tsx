import type { CollectionItem, CollectionSource } from "@/domain/collection/collection-item";
import {
  deleteCollectionItemAction,
  updateCollectionItemAction,
} from "@/app/(dashboard)/collection/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { Pokemon } from "@/domain/pokemon/pokemon";
import { PokemonShowcaseCard } from "@/components/pokemon/pokemon-showcase-card";

function getSourceLabel(source: CollectionSource): string {
  if (source === "IMAGE") return "Gemini Vision";
  if (source === "AI") return "Assistant";
  return "Manual";
}

type CollectionTableProps = {
  items: CollectionItem[];
};

function toPokemonFromItem(item: CollectionItem): Pokemon {
  return {
    id: item.pokemonId,
    name: item.pokemon?.name ?? "pokemon",
    types: item.pokemon?.types ?? [],
    spriteUrl: item.pokemon?.spriteUrl ?? null,
    artworkUrl: item.pokemon?.artworkUrl ?? null,
    abilities: item.pokemon?.abilities,
    heightM: item.pokemon?.heightM,
    weightKg: item.pokemon?.weightKg,
    baseExperience: item.pokemon?.baseExperience,
  };
}

export function CollectionTable({ items }: CollectionTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
        Aun no tienes Pokemon en tu coleccion.
      </p>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <PokemonShowcaseCard
          key={item.id}
          pokemon={toPokemonFromItem(item)}
          showCuriosity={false}
          headerNote={`${getSourceLabel(item.source)} · ${item.quantity} unidad${item.quantity === 1 ? "" : "es"}`}
          footer={(
            <div className="flex flex-col gap-2">
              <form action={deleteCollectionItemAction}>
                <input type="hidden" name="itemId" value={item.id} />
                <ConfirmSubmitButton
                  idleText="Eliminar"
                  pendingText="Eliminando..."
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700"
                  confirmTitle="Eliminar Pokemon de la coleccion"
                  confirmDescription={`Se eliminara ${item.pokemon?.name ?? "este Pokemon"} de tu coleccion. Esta accion no se puede deshacer.`}
                  confirmActionText="Si, eliminar"
                />
              </form>

              <details className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-700">Editar</summary>

                <form action={updateCollectionItemAction} className="mt-2 space-y-2">
                  <input type="hidden" name="itemId" value={item.id} />

                  <label className="block text-xs text-slate-700">
                    Cantidad
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      required
                      defaultValue={item.quantity}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <label className="block text-xs text-slate-700">
                    Nickname
                    <input
                      name="nickname"
                      type="text"
                      defaultValue={item.nickname ?? ""}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <label className="block text-xs text-slate-700">
                    Notas
                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={item.notes ?? ""}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <FormSubmitButton
                    idleText="Guardar"
                    pendingText="Guardando..."
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800"
                  />
                </form>
              </details>
            </div>
          )}
        >
          <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <span className="font-semibold">Nickname:</span> {item.nickname ?? "-"}
            </p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <span className="font-semibold">Fuente:</span> {getSourceLabel(item.source)}
            </p>
          </div>
          {item.notes ? (
            <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
              {item.notes}
            </p>
          ) : null}
        </PokemonShowcaseCard>
      ))}
    </section>
  );
}
