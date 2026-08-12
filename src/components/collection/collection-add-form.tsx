"use client";

import { useState } from "react";
import { addCollectionItemAction } from "@/app/(dashboard)/collection/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type CollectionAddFormProps = {
  defaultOpen?: boolean;
};

export function CollectionAddForm({ defaultOpen = false }: CollectionAddFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Agregar manualmente
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar Pokemon manualmente"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Agregar manualmente</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Ingresa el ID del Pokemon y los datos opcionales para guardarlo en tu coleccion.
            </p>

            <form action={addCollectionItemAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Pokemon ID</span>
                <input
                  name="pokemonId"
                  type="number"
                  min={1}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Cantidad</span>
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-slate-700">Nickname (opcional)</span>
                <input
                  name="nickname"
                  type="text"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-slate-700">Notas (opcional)</span>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <input type="hidden" name="source" value="MANUAL" />

              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <FormSubmitButton
                  idleText="Agregar a coleccion"
                  pendingText="Agregando..."
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
