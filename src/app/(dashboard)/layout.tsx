import type { ReactNode } from "react";
import { requireCurrentUser } from "@/application/auth/get-current-user";
import { DashboardNavbar } from "@/components/layout/dashboard-navbar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}