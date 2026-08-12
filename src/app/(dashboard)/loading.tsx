export default function DashboardLoading() {
  return (
    <section className="space-y-4">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </section>
  );
}
