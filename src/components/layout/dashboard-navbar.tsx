"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/infrastructure/firebase/firebase-client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pokedex", label: "PokeDex" },
  { href: "/collection", label: "Colección" },
  { href: "/identify", label: "Visión" },
  { href: "/analytics", label: "Analítica" },
  { href: "/assistant", label: "Asistente IA" },
];

export function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut(getFirebaseAuth());
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
            <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-red-500" />
            <span className="truncate">PokeDex Manager</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:text-sm"
          >
            Logout
          </button>
        </div>

        <nav className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}