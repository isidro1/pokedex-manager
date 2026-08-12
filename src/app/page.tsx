import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-10 sm:px-10 lg:px-14">
      <div className="pointer-events-none absolute left-[-120px] top-[-80px] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(239,68,68,0.5)_0%,_rgba(239,68,68,0)_70%)]" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-60px] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(34,197,94,0.35)_0%,_rgba(34,197,94,0)_72%)]" />

      <main className="z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center">
        <p className="text-xs font-medium tracking-[0.22em] text-slate-600 uppercase">
          Full Stack Technical Challenge
        </p>
        <h1 className="mt-4 max-w-4xl text-balance text-4xl leading-tight font-semibold text-slate-900 sm:text-6xl">
          PokeDex Manager
        </h1>
        <p className="mt-6 max-w-3xl text-pretty text-base leading-relaxed text-slate-700 sm:text-lg">
          Base inicial del proyecto para gestionar colecciones personales de Pokemon con autenticacion,
          integracion con PokeAPI, persistencia en PostgreSQL, IA multimodal con Gemini y herramientas MCP.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Autenticacion Firebase",
            "Coleccion por usuario",
            "Gemini Vision",
            "Assistant con MCP",
          ].map((item) => (
            <article
              key={item}
              className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <p className="text-sm font-medium text-slate-800">{item}</p>
            </article>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Iniciar sesion
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800"
          >
            Crear cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}
