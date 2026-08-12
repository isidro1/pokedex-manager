"use client";

import { useState } from "react";

type MCPToolView = {
  name: string;
  displayName: string;
  description: string;
  category: "consulta" | "analitica" | "accion";
  destructive?: boolean;
};

type MCPActivityView = {
  totalRuns: number;
  successRate: number;
  totalToolCalls: number;
  averageLatencyMs: number | null;
};

type MCPHelpModalProps = {
  tools: MCPToolView[];
  activity: MCPActivityView | null;
};

function getCategoryLabel(tool: MCPToolView): string {
  if (tool.category === "accion") {
    return "Accion";
  }

  if (tool.category === "analitica") {
    return "Analítica";
  }

  return "Consulta";
}

function getCategoryClasses(tool: MCPToolView): string {
  if (tool.category === "accion") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (tool.category === "analitica") {
    return "border-violet-300 bg-violet-50 text-violet-800";
  }

  return "border-sky-300 bg-sky-50 text-sky-800";
}

export function MCPHelpModal({ tools, activity }: MCPHelpModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Ayuda MCP
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ayuda e info MCP"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Ayuda e info MCP</h2>
                <p className="text-xs text-slate-500">Tools disponibles para consulta, analítica y acciones seguras.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </header>

            <div className="grid max-h-[calc(85vh-58px)] gap-4 overflow-y-auto p-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Capacidades</p>
                <ul className="mt-2 space-y-2 text-xs text-slate-700">
                  {tools.map((tool) => (
                    <li key={tool.name} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">{tool.displayName}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{tool.description}</p>
                        </div>
                        <div className="shrink-0 space-y-1 text-right">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getCategoryClasses(tool)}`}>
                            {getCategoryLabel(tool)}
                          </span>
                          <p className="text-[10px] text-slate-400">{tool.name}</p>
                        </div>
                      </div>
                      {tool.destructive ? (
                        <p className="mt-1 text-[10px] font-medium text-amber-700">Requiere confirmacion</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">Actividad IA/MCP</p>
                {activity ? (
                  <div className="mt-2 space-y-1 text-xs text-emerald-900">
                    <p>Runs: {activity.totalRuns}</p>
                    <p>Exito: {activity.successRate}%</p>
                    <p>Tool calls: {activity.totalToolCalls}</p>
                    <p>Latencia media: {activity.averageLatencyMs !== null ? `${activity.averageLatencyMs} ms` : "N/A"}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-emerald-900">No disponible temporalmente.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
