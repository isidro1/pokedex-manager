import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-8 sm:px-10 lg:px-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_82%_80%,rgba(16,185,129,0.2),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))]" />
      <div className="pointer-events-none absolute left-[-120px] top-[-80px] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(239,68,68,0.35)_0%,_rgba(239,68,68,0)_72%)]" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-60px] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(34,197,94,0.25)_0%,_rgba(34,197,94,0)_72%)]" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <p className="text-sm font-semibold tracking-tight text-slate-900">PokeDex Manager</p>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:text-sm"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-600 uppercase">
              Full Stack Technical Challenge
            </p>
            <h1 className="mt-4 max-w-4xl text-balance text-4xl leading-tight font-semibold text-slate-900 sm:text-6xl">
              Tu coleccion Pokemon con IA de verdad
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-slate-700 sm:text-lg">
              Administra tu inventario, identifica Pokemon desde imagen, recibe recomendaciones
              inteligentes y conversa con un asistente que entiende tu contexto.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-700 sm:text-sm">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1">Firebase Auth</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">PokeAPI + Prisma</span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1">Gemini Vision</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">MCP Assistant</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Empezar ahora
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                Crear mi cuenta
              </Link>
            </div>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Flujo sugerido</p>
            <ol className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">1) Carga o identifica un Pokemon</p>
                <p className="mt-1 text-xs text-slate-600">Usa PokeDex o Vision para encontrarlo rapido.</p>
              </li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">2) Agregalo a tu coleccion</p>
                <p className="mt-1 text-xs text-slate-600">Guarda cantidad, alias y notas de cada entrada.</p>
              </li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">3) Analiza y compara</p>
                <p className="mt-1 text-xs text-slate-600">Recomendaciones IA y comparador interactivo 1 vs 1.</p>
              </li>
            </ol>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <p className="text-[10px] uppercase text-slate-500">Vision</p>
                <p className="mt-1 font-semibold text-slate-900">Identificacion por imagen</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <p className="text-[10px] uppercase text-slate-500">Assistant</p>
                <p className="mt-1 font-semibold text-slate-900">Herramientas MCP seguras</p>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
