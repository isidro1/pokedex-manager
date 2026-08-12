import type { ReactNode } from "react";

type MetricTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
};

export function MetricTile({ label, value, hint, className }: MetricTileProps) {
  return (
    <article className={`rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${className ?? ""}`}>
      <p className="text-xs tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}
