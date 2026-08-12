import Link from "next/link";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import { getCollectionStats } from "@/application/collection/get-collection-stats";
import { getCollectionByUserId } from "@/application/collection/collection-service";
import { listConversationsByUserId } from "@/infrastructure/database/repositories/conversation-repository";

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();
  const collection = await getCollectionByUserId(currentUser.id);
  const stats = getCollectionStats(collection);
  const conversations = await listConversationsByUserId(currentUser.id);

  const primaryActions = [
    {
      title: "Buscar en Pokedex",
      description: "Busqueda clasica por nombre o ID para agregar rapidamente.",
      href: "/pokedex",
    },
    {
      title: "Asistente IA (chat)",
      description: "Interaccion conversacional para consultar y operar tu coleccion.",
      href: "/assistant",
    },
    {
      title: "Mi coleccion",
      description: "Edita cantidades, notas y elimina registros de forma segura.",
      href: "/collection",
    },
    {
      title: "Identificar por imagen",
      description: "Sube imagen de Pokemon y confirma antes de guardar.",
      href: "/identify",
    },
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-2 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-yellow-50 to-blue-50 p-4">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">
          Area privada
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">
          Bienvenido, {currentUser.displayName ?? currentUser.email}. Desde aqui puedes
          gestionar tu coleccion y usar las funciones de IA.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Pokemon registrados</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalPokemon}</p>
        </article>
        <article className="rounded-2xl border border-yellow-300 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Unidades totales</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalUnits}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Duplicados</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.duplicateEntries}</p>
        </article>
        <article className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-600">Conversaciones IA</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{conversations.length}</p>
        </article>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Acciones rapidas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {primaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <p className="text-base font-semibold text-slate-900">{action.title}</p>
              <p className="mt-2 text-sm text-slate-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <h2 className="text-base font-semibold text-indigo-900">Sobre la interaccion</h2>
        <p className="mt-2 text-sm text-indigo-900">
          La pantalla de Pokedex usa busqueda clasica. La experiencia tipo chat esta en
          Asistente IA, donde puedes preguntar en lenguaje natural y ejecutar acciones de la
          coleccion.
        </p>
      </section>
    </section>
  );
}