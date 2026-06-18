import { revalidatePath } from "next/cache";

import { AppShell } from "@/components/layout/app-shell";
import { formatMoney } from "@/lib/finance/money";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

async function updateFinancialSpaceAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();

  const { data: space, error: spaceError } = await supabase.rpc(
    "ensure_personal_space",
  );

  if (spaceError) {
    throw new Error(spaceError.message);
  }

  if (!space) {
    throw new Error("No se encontró un espacio financiero.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const monthlyBudget = Number(formData.get("monthlyBudget") ?? 0);
  const currencyValue = String(formData.get("currency") ?? "COP");
  const currency = currencyValue === "USD" ? "USD" : "COP";

  if (!name) {
    throw new Error("El nombre del espacio es obligatorio.");
  }

  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
    throw new Error("El presupuesto mensual debe ser un número válido.");
  }

  const { error } = await supabase
    .from("financial_spaces")
    .update({
      name,
      monthly_budget: monthlyBudget,
      currency,
    })
    .eq("id", space.id)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: space, error: spaceError } = await supabase.rpc(
    "ensure_personal_space",
  );

  if (spaceError) {
    throw new Error(spaceError.message);
  }

  if (!space) {
    throw new Error("No se encontró un espacio financiero.");
  }

  return (
    <AppShell active="settings" userEmail={user.email}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Configuración
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Más</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Ajusta la base de tu espacio financiero, presupuesto mensual y
            preferencias principales de Brújula.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              Espacio financiero
            </p>

            <h2 className="text-2xl font-semibold">{space.name}</h2>

            <div className="mt-5 grid gap-4">
              <article className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Tipo</p>
                <p className="mt-2 text-lg font-semibold">
                  {space.type === "personal" ? "Personal" : "Compartido"}
                </p>
              </article>

              <article className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Presupuesto mensual</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-200">
                  {formatMoney(Number(space.monthly_budget))}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Este valor sirve como respaldo cuando no tienes ingresos
                  esperados creados para un periodo.
                </p>
              </article>

              <article className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Moneda</p>
                <p className="mt-2 text-lg font-semibold">{space.currency}</p>
              </article>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              Ajustes principales
            </p>

            <h2 className="text-2xl font-semibold">Editar configuración</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Mantén estos datos simples. La app usará esta base para calcular
              proyecciones cuando todavía no tengas ingresos esperados.
            </p>

            <form action={updateFinancialSpaceAction} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Nombre del espacio
                </label>
                <input
                  name="name"
                  defaultValue={space.name}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Presupuesto mensual base
                </label>
                <input
                  name="monthlyBudget"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={Number(space.monthly_budget)}
                  required
                  placeholder="2500000"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Ejemplo: si no tienes ingresos esperados para julio, Brújula
                  puede usar este presupuesto como base estimada.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Moneda
                </label>
                <select
                  name="currency"
                  defaultValue={space.currency}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <button className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300">
                Guardar configuración
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-sky-300/20 bg-sky-300/10 p-4 text-sm leading-6 text-sky-100/80">
              Próximamente aquí pondremos perfil financiero, metas, preferencias
              de IA, seguridad y espacios compartidos.
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
