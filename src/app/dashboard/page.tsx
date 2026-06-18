export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { formatMoney } from "@/lib/finance/money";
import { requireUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: existingSpaces, error: spacesError } = await supabase
    .from("financial_spaces")
    .select("*")
    .order("created_at", { ascending: true });

  if (spacesError) {
    throw new Error(spacesError.message);
  }

  let spaces = existingSpaces ?? [];

  if (spaces.length === 0) {
    const { data: createdSpace, error: createSpaceError } = await supabase.rpc(
      "ensure_personal_space",
    );

    if (createSpaceError) {
      throw new Error(createSpaceError.message);
    }

    if (!createdSpace) {
      throw new Error("No se pudo crear el espacio financiero personal.");
    }

    spaces = [createdSpace];
  }

  const primarySpace = spaces[0];

  if (!primarySpace) {
    throw new Error("No se encontró un espacio financiero activo.");
  }

  return (
    <AppShell active="dashboard" userEmail={user.email}>
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Brújula V2
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Inicio financiero
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Tu centro de control para movimientos reales, ingresos esperados,
            agenda de pagos y disponible estimado.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <p className="text-sm text-slate-400">Espacio principal</p>
            <h2 className="mt-3 text-2xl font-semibold">
              {primarySpace.name}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Tipo: {primarySpace.type === "personal" ? "Personal" : "Compartido"}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <p className="text-sm text-slate-400">Presupuesto mensual</p>
            <h2 className="mt-3 text-2xl font-semibold">
              {formatMoney(Number(primarySpace.monthly_budget))}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Base inicial para la proyección.
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 shadow-2xl shadow-emerald-950/20">
            <p className="text-sm text-emerald-200">Estado</p>
            <h2 className="mt-3 text-2xl font-semibold text-emerald-100">
              Base lista
            </h2>
            <p className="mt-2 text-sm text-emerald-100/80">
              Supabase, sesión y espacio financiero funcionando.
            </p>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
