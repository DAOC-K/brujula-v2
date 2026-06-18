import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppSection =
  | "dashboard"
  | "movements"
  | "income"
  | "payments"
  | "assistant"
  | "settings";

type AppShellProps = {
  active: AppSection;
  userEmail?: string | null;
  children: ReactNode;
};

const navItems: {
  href: string;
  label: string;
  shortLabel: string;
  section: AppSection;
}[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    shortLabel: "Inicio",
    section: "dashboard",
  },
  {
    href: "/movements",
    label: "Movimientos",
    shortLabel: "Mov.",
    section: "movements",
  },
  {
    href: "/income",
    label: "Ingresos esperados",
    shortLabel: "Ingresos",
    section: "income",
  },
  {
    href: "/payments",
    label: "Agenda de pagos",
    shortLabel: "Agenda",
    section: "payments",
  },
  {
    href: "/assistant",
    label: "Asistente IA",
    shortLabel: "IA",
    section: "assistant",
  },
  {
    href: "/settings",
    label: "Más",
    shortLabel: "Más",
    section: "settings",
  },
];

async function signOutAction() {
  "use server";

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

export function AppShell({ active, userEmail, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 px-6 py-8 lg:block">
          <div className="mb-10">
            <p className="text-lg font-bold text-emerald-300">Brújula</p>
            <p className="mt-1 text-xs text-slate-500">Finanzas personales</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = item.section === active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-emerald-400 font-semibold text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-500">Sesión activa</p>
            <p className="mt-1 truncate text-sm text-slate-300">
              {userEmail ?? "Usuario"}
            </p>

            <form action={signOutAction} className="mt-4">
              <button className="w-full rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        <section className="flex min-h-screen flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 lg:hidden">
            <div>
              <p className="text-sm font-bold text-emerald-300">Brújula</p>
              <p className="text-xs text-slate-500">V2</p>
            </div>

            <form action={signOutAction}>
              <button className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-200">
                Salir
              </button>
            </form>
          </div>

          <div className="flex-1 px-5 py-6 pb-28 lg:px-8 lg:py-8">
            {children}
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#050816]/95 px-3 py-3 backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
              {navItems.map((item) => {
                const isActive = item.section === active;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-2xl px-2 py-2 text-center text-[11px] transition ${
                      isActive
                        ? "bg-emerald-400 font-semibold text-slate-950"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.shortLabel}
                  </Link>
                );
              })}
            </div>
          </nav>
        </section>
      </div>
    </main>
  );
}
