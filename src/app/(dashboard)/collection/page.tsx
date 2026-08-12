import Link from "next/link";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import { getCollectionByUserId } from "@/application/collection/collection-service";
import { getCollectionStats } from "@/application/collection/get-collection-stats";
import { CollectionAddForm } from "@/components/collection/collection-add-form";
import { CollectionStatusBanner } from "@/components/collection/collection-status-banner";
import { CollectionTable } from "@/components/collection/collection-table";
import { MetricTile } from "@/components/ui/metric-tile";

type CollectionPageProps = {
  searchParams?: Promise<{
    status?: string;
    code?: string;
  }>;
};

export default async function CollectionPage({ searchParams }: CollectionPageProps) {
  const currentUser = await requireCurrentUser();
  const collectionItems = await getCollectionByUserId(currentUser.id);
  const stats = getCollectionStats(collectionItems);
  const params = searchParams ? await searchParams : undefined;
  const shouldOpenAddForm = params?.code === "add_failed";

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-100 p-4">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">Mi colección</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Colección</h1>
        <p className="mt-2 text-slate-600">
          Esta pantalla es tu inventario: cantidades, alias y notas de tus Pokemon guardados.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Para descubrir nuevos Pokemon usa
          {" "}
          <Link href="/pokedex" className="font-medium text-slate-700 underline">
            PokeDex
          </Link>
          .
        </p>
      </header>

      <CollectionStatusBanner key={params?.status ?? "none"} status={params?.status} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile label="Registros" value={stats.totalPokemon} hint="Pokemon distintos guardados" />
        <MetricTile label="Unidades" value={stats.totalUnits} hint="Suma total de cantidades" />
        <MetricTile label="Duplicados" value={stats.duplicateEntries} hint="Entradas con cantidad mayor a 1" />
      </section>

      <CollectionAddForm
        key={shouldOpenAddForm ? "add-form-open" : "add-form-closed"}
        defaultOpen={shouldOpenAddForm}
      />

      <CollectionTable items={collectionItems} />
    </section>
  );
}