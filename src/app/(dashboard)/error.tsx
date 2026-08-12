"use client";

type DashboardErrorProps = {
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-2xl font-semibold text-red-900">Ocurrio un error inesperado</h1>
      <p className="text-sm text-red-800">
        No pudimos completar la operacion. Intenta nuevamente.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white"
      >
        Reintentar
      </button>
    </section>
  );
}
