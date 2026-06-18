import { revalidatePath } from "next/cache";

import { AppShell } from "@/components/layout/app-shell";
import { todayValue } from "@/lib/finance/dates";
import {
  incomePlanDraftToInsert,
  incomePlanRowToIncomePlan,
  movementDraftToInsert,
} from "@/lib/finance/mappers";
import { formatMoney, sumMoney } from "@/lib/finance/money";
import {
  buildIncomePlan,
  getIncomeDisplayStatus,
  isIncomeExpected,
  markIncomePlanAsReceived,
} from "@/lib/finance/incomes";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

async function createIncomePlanAction(formData: FormData) {
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

  const kindValue = String(formData.get("kind") ?? "single");
  const kind =
    kindValue === "recurrent" || kindValue === "temporary"
      ? kindValue
      : "single";

  const notesValue = String(formData.get("notes") ?? "").trim();

  const draft = buildIncomePlan({
    spaceId: space.id,
    userId: user.id,
    name: String(formData.get("name") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    category: String(formData.get("category") ?? ""),
    kind,
    expectedDate: String(formData.get("expectedDate") ?? todayValue()),
    notes: notesValue ? notesValue : null,
  });

  const { error } = await supabase
    .from("income_plans")
    .insert(incomePlanDraftToInsert(draft));

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/income");
  revalidatePath("/dashboard");
}

async function markIncomeAsReceivedAction(formData: FormData) {
  "use server";

  const { supabase } = await requireUser();
  const incomeId = String(formData.get("incomeId") ?? "");

  if (!incomeId) {
    throw new Error("No se recibió el ingreso a confirmar.");
  }

  const { data: incomeRow, error: incomeError } = await supabase
    .from("income_plans")
    .select("*")
    .eq("id", incomeId)
    .single();

  if (incomeError) {
    throw new Error(incomeError.message);
  }

  const income = incomePlanRowToIncomePlan(incomeRow);
  const result = markIncomePlanAsReceived(income);

  const { error: updateError } = await supabase
    .from("income_plans")
    .update({
      status: result.updatedIncome.status,
      received_at: result.updatedIncome.receivedAt,
    })
    .eq("id", income.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: movementError } = await supabase
    .from("movements")
    .insert(movementDraftToInsert(result.movement));

  if (movementError) {
    throw new Error(movementError.message);
  }

  revalidatePath("/income");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

async function deleteExpectedIncomeAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();
  const incomeId = String(formData.get("incomeId") ?? "");

  if (!incomeId) {
    throw new Error("No se recibió el ingreso a eliminar.");
  }

  const { error } = await supabase
    .from("income_plans")
    .delete()
    .eq("id", incomeId)
    .eq("user_id", user.id)
    .neq("status", "received");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/income");
  revalidatePath("/dashboard");
}

export default async function IncomePage() {
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

  const { data: incomeRows, error: incomesError } = await supabase
    .from("income_plans")
    .select("*")
    .eq("space_id", space.id)
    .order("expected_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (incomesError) {
    throw new Error(incomesError.message);
  }

  const incomes = (incomeRows ?? []).map(incomePlanRowToIncomePlan);

  const expectedIncomes = incomes.filter((income) => income.status === "expected");
  const receivedIncomes = incomes.filter((income) => income.status === "received");

  const expectedTotal = sumMoney(expectedIncomes, (income) => income.amount);
  const receivedTotal = sumMoney(receivedIncomes, (income) => income.amount);

  return (
    <AppShell active="income" userEmail={user.email}>
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Planificación de entradas
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Ingresos esperados
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Aquí planeas salarios, ingresos recurrentes, ingresos únicos y
            entradas temporales. Al confirmar recibido, Brújula crea un
            movimiento real de ingreso.
          </p>

          <form action={createIncomePlanAction} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Tipo de ingreso
              </label>
              <select
                name="kind"
                defaultValue="single"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              >
                <option value="single">Único</option>
                <option value="recurrent">Recurrente</option>
                <option value="temporary">Temporal</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Nombre
              </label>
              <input
                name="name"
                required
                placeholder="Ej: Salario, venta, freelance"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Valor
              </label>
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                placeholder="2500000"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Categoría
              </label>
              <input
                name="category"
                required
                placeholder="Ej: Salario, ventas, extra"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Fecha esperada
              </label>
              <input
                name="expectedDate"
                type="date"
                defaultValue={todayValue()}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Notas
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Opcional"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <button className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300">
              Guardar ingreso esperado
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-sky-300/20 bg-sky-300/10 p-5">
              <p className="text-sm text-sky-200">Esperado</p>
              <h2 className="mt-3 text-2xl font-semibold text-sky-100">
                {formatMoney(expectedTotal)}
              </h2>
            </article>

            <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <p className="text-sm text-emerald-200">Recibido</p>
              <h2 className="mt-3 text-2xl font-semibold text-emerald-100">
                {formatMoney(receivedTotal)}
              </h2>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-400">Registros</p>
              <h2 className="mt-3 text-2xl font-semibold">
                {incomes.length}
              </h2>
            </article>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <div className="mb-5">
              <p className="text-sm text-slate-400">Lista</p>
              <h2 className="text-2xl font-semibold">Ingresos planificados</h2>
            </div>

            {incomes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-lg font-semibold">Sin ingresos todavía</p>
                <p className="mt-2 text-sm text-slate-400">
                  Crea tu primer ingreso esperado para verlo en la planeación.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomes.map((income) => {
                  const canMarkReceived = isIncomeExpected(income);
                  const canDelete = income.status !== "received";

                  return (
                    <article
                      key={income.id}
                      className="rounded-3xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{income.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {income.category} ·{" "}
                            {income.expectedDate ?? "Sin fecha"} ·{" "}
                            {income.kind === "recurrent"
                              ? "Recurrente"
                              : income.kind === "temporary"
                                ? "Temporal"
                                : "Único"}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-sky-200">
                            {getIncomeDisplayStatus(income)}
                          </p>

                          {income.notes ? (
                            <p className="mt-2 text-sm text-slate-500">
                              {income.notes}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {canMarkReceived ? (
                              <form action={markIncomeAsReceivedAction}>
                                <input
                                  type="hidden"
                                  name="incomeId"
                                  value={income.id}
                                />
                                <button className="rounded-full border border-emerald-300/20 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/10">
                                  Marcar recibido
                                </button>
                              </form>
                            ) : null}

                            {canDelete ? (
                              <form action={deleteExpectedIncomeAction}>
                                <input
                                  type="hidden"
                                  name="incomeId"
                                  value={income.id}
                                />
                                <button className="rounded-full border border-rose-300/20 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10">
                                  Eliminar
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>

                        <p className="text-right text-lg font-bold text-emerald-300">
                          +{formatMoney(income.amount)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
