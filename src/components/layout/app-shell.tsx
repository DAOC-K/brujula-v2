import Link from "next/link";

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
  children: React.ReactNode;
};

const navigationItems: {
  href: string;
  label: string;
  mobileLabel: string;
  active: AppSection;
  icon: string;
}[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    mobileLabel: "Inicio",
    active: "dashboard",
    icon: "⌂",
  },
  {
    href: "/movements",
    label: "Movimientos",
    mobileLabel: "Mov.",
    active: "movements",
    icon: "↕",
  },
  {
    href: "/income",
    label: "Ingresos esperados",
    mobileLabel: "Ingresos",
    active: "income",
    icon: "+",
  },
  {
    href: "/payments",
    label: "Agenda de pagos",
    mobileLabel: "Pagos",
    active: "payments",
    icon: "✓",
  },
  {
    href: "/assistant",
    label: "Asistente IA",
    mobileLabel: "IA",
    active: "assistant",
    icon: "✦",
  },
  {
    href: "/settings",
    label: "Más",
    mobileLabel: "Más",
    active: "settings",
    icon: "•••",
  },
];

function getActiveLabel(active: AppSection) {
  return navigationItems.find((item) => item.active === active)?.label ?? "Inicio";
}

export function AppShell({ active, userEmail, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#030716] text-white">
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#030716]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-300">Brújula</p>
            <p className="truncate text-xs text-slate-500">
              {getActiveLabel(active)} · {userEmail ?? "Usuario"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/settings"
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300"
            >
              Más
            </Link>

            <form action="/auth/signout" method="post">
              <button className="rounded-full border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-200">
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 hidden w-[310px] border-r border-white/10 bg-[#030716] px-8 py-8 lg:block">
        <div>
          <p className="text-lg font-bold text-emerald-300">Brújula</p>
          <p className="mt-1 text-sm text-slate-500">Finanzas personales</p>
        </div>

        <nav className="mt-12 space-y-3">
          {navigationItems.map((item) => {
            const isActive = active === item.active;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-slate-500">Sesión activa</p>
          <p className="mt-2 truncate text-sm text-slate-200">
            {userEmail ?? "Usuario"}
          </p>

          <form action="/auth/signout" method="post" className="mt-4">
            <button className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:ml-[310px] lg:px-8 lg:pb-10 lg:pt-10">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#030716]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-6 gap-1">
          {navigationItems.map((item) => {
            const isActive = active === item.active;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="mt-1 truncate">{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

