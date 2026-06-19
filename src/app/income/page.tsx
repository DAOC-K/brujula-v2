import { revalidatePath } from "next/cache";

import { ConfirmActionButton } from "@/components/finance/confirm-action-button";
import { EditIncomePlanDialog } from "@/components/finance/edit-income-plan-dialog";
import { IncomePlanDialog } from "@/components/finance/income-plan-dialog";
import { MonthSelector } from "@/components/finance/month-selector";
import { AppShell } from "@/components/layout/app-shell";
import {
  currentMonthValue,
  getProjectedDateInMonth,
  shiftMonth,
  todayValue,
} from "@/lib/finance/dates";
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
import {
  isProjectedPlan,
  parseProjectedPlanId,
  projectIncomePlansForMonth,
} from "@/lib/finance/projections";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

type IncomePageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

function resolveMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return currentMonthValue();
  }

  return month;
}

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

  const projected = parseProjectedPlanId(incomeId);

  if (projected?.planType === "income") {
    const { data: sourceIncomeRow, error: sourceIncomeError } = await supabase
      .from("income_plans")
      .select("*")
      .eq("id", projected.sourceId)
      .single();

    if (sourceIncomeError) {
      throw new Error(sourceIncomeError.message);
    }

    const sourceIncome = incomePlanRowToIncomePlan(sourceIncomeRow);
    const receivedAt = new Date().toISOString();
    const projectedExpectedDate = getProjectedDateInMonth(
      sourceIncome.expectedDate,
      projected.month,
    );

    const { data: createdIncomeRow, error: createIncomeError } = await supabase
      .from("income_plans")
      .insert({
        space_id: sourceIncome.spaceId,
        user_id: sourceIncome.userId,
        name: sourceIncome.name,
        amount: sourceIncome.amount,
        category: sourceIncome.category,
        kind: sourceIncome.kind,
        status: "received",
        expected_date: projectedExpectedDate,
        received_at: receivedAt,
        notes: sourceIncome.notes,
      })
      .select("*")
      .single();

    if (createIncomeError) {
      throw new Error(createIncomeError.message);
    }

    const { error: movementError } = await supabase.from("movements").insert({
      space_id: createdIncomeRow.space_id,
      user_id: createdIncomeRow.user_id,
      type: "income",
      name: createdIncomeRow.name,
      amount: Number(createdIncomeRow.amount),
      category: createdIncomeRow.category,
      occurred_on: projectedExpectedDate,
      is_fixed: createdIncomeRow.kind === "recurrent",
      visibility: "private",
      source_type: "income_plan",
      source_payment_plan_id: null,
      source_income_plan_id: createdIncomeRow.id,
      source_label: "Desde Ingresos",
      notes: createdIncomeRow.notes,
    });

    if (movementError) {
      throw new Error(movementError.message);
    }

    revalidatePath("/income");
    revalidatePath("/movements");
    revalidatePath("/dashboard");
    return;
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

async function updateExpectedIncomeAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();
  const incomeId = String(formData.get("incomeId") ?? "");

  if (!incomeId) {
    throw new Error("No se recibió el ingreso a editar.");
  }

  const kindValue = String(formData.get("kind") ?? "single");
  const kind =
    kindValue === "recurrent" || kindValue === "temporary"
      ? kindValue
      : "single";

  const amount = Number(formData.get("amount") ?? 0);
  const notesValue = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase
    .from("income_plans")
    .update({
      name: String(formData.get("name") ?? ""),
      amount,
      category: String(formData.get("category") ?? ""),
      kind,
      expected_date: String(formData.get("expectedDate") ?? todayValue()),
      notes: notesValue ? notesValue : null,
    })
    .eq("id", incomeId)
    .eq("user_id", user.id)
    .neq("status", "received");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/income");
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

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const params = await searchParams;
  const month = resolveMonth(params?.month);

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

  const incomes = projectIncomePlansForMonth(
    (incomeRows ?? []).map(incomePlanRowToIncomePlan),
    month,
  );

  const expectedIncomes = incomes.filter(
    (income) => income.status === "expected",
  );
  const receivedIncomes = incomes.filter(
    (income) => income.status === "received",
  );

  const expectedTotal = sumMoney(expectedIncomes, (income) => income.amount);
  const receivedTotal = sumMoney(receivedIncomes, (income) => income.amount);

  return (
    <AppShell active="income" userEmail={user.email}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
              Planificación de entradas
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Ingresos esperados
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Programa salarios, ingresos recurrentes, entradas temporales o
              ingresos únicos. Al confirmar recibido, Brújula crea
              automáticamente un movimiento real.
            </p>
          </div>

          <IncomePlanDialog
            action={createIncomePlanAction}
            defaultExpectedDate={`${month}-01`}
          />
        </div>

        <div className="mb-6">
          <MonthSelector month={month} basePath="/income" />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
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
            <h2 className="mt-3 text-2xl font-semibold">{incomes.length}</h2>
          </article>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <p className="text-sm text-slate-400">Lista del periodo</p>
            <h2 className="text-2xl font-semibold">Ingresos planificados</h2>
          </div>

          {incomes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-lg font-semibold">
                No hay ingresos en este periodo
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Cambia de mes o crea un ingreso con fecha dentro de este
                periodo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => {
                const isProjected = isProjectedPlan(income.id);
                const canMarkReceived = isIncomeExpected(income);
                const canEdit = income.status !== "received" && !isProjected;
                const canDelete = income.status !== "received" && !isProjected;

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
                          {isProjected
                            ? "Programado recurrente"
                            : getIncomeDisplayStatus(income)}
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

                          {canEdit ? (
                            <EditIncomePlanDialog
                              action={updateExpectedIncomeAction}
                              income={{
                                id: income.id,
                                name: income.name,
                                amount: income.amount,
                                category: income.category,
                                kind: income.kind,
                                expectedDate: income.expectedDate,
                                notes: income.notes,
                              }}
                            />
                          ) : null}

                          {canDelete ? (
                            <ConfirmActionButton
                              action={deleteExpectedIncomeAction}
                              hiddenFields={[
                                {
                                  name: "incomeId",
                                  value: income.id,
                                },
                              ]}
                              triggerLabel="Eliminar"
                              title="¿Eliminar este ingreso?"
                              description={`Vas a eliminar "${income.name}" de tus ingresos esperados. Esta acción solo aplica para ingresos que todavía no han sido recibidos.`}
                              confirmLabel="Sí, eliminar"
                              tone="danger"
                            />
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
      </section>
    </AppShell>
  );
}


