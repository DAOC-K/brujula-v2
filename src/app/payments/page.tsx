import { revalidatePath } from "next/cache";

import { ConfirmActionButton } from "@/components/finance/confirm-action-button";
import { EditPaymentPlanDialog } from "@/components/finance/edit-payment-plan-dialog";
import { MonthSelector } from "@/components/finance/month-selector";
import { PaymentPlanDialog } from "@/components/finance/payment-plan-dialog";
import { AppShell } from "@/components/layout/app-shell";
import {
  currentMonthValue,
  getProjectedDateInMonth,
  shiftMonth,
  todayValue,
} from "@/lib/finance/dates";
import {
  movementDraftToInsert,
  paymentPlanDraftToInsert,
  paymentPlanRowToPaymentPlan,
} from "@/lib/finance/mappers";
import { formatMoney, sumMoney } from "@/lib/finance/money";
import {
  buildPaymentPlan,
  getPaymentDisplayStatus,
  isPaymentActive,
  markPaymentPlanAsPaid,
} from "@/lib/finance/payments";
import {
  isProjectedPlan,
  parseProjectedPlanId,
  projectPaymentPlansForMonth,
} from "@/lib/finance/projections";
import { requireUser } from "@/lib/supabase/auth";
import { isUniqueViolation } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";

type PaymentsPageProps = {
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

async function createPaymentPlanAction(formData: FormData) {
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

  const amount = Number(formData.get("amount") ?? 0);
  const installmentTotalRaw = Number(formData.get("installmentTotal") ?? 0);
  const installmentTotal =
    kind === "temporary" && installmentTotalRaw > 0
      ? installmentTotalRaw
      : null;

  const totalAmount =
    kind === "temporary" && installmentTotal ? amount * installmentTotal : null;

  const notesValue = String(formData.get("notes") ?? "").trim();

  const draft = buildPaymentPlan({
    spaceId: space.id,
    userId: user.id,
    name: String(formData.get("name") ?? ""),
    amount,
    category: String(formData.get("category") ?? ""),
    kind,
    dueDate: String(formData.get("dueDate") ?? todayValue()),
    installmentNumber: kind === "temporary" ? 1 : null,
    installmentTotal,
    totalAmount,
    remainingAmount: totalAmount,
    notes: notesValue ? notesValue : null,
  });

  const { error } = await supabase
    .from("payment_plans")
    .insert(paymentPlanDraftToInsert(draft));

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

async function markPaymentAsPaidAction(formData: FormData) {
  "use server";

  const { supabase } = await requireUser();
  const paymentId = String(formData.get("paymentId") ?? "");

  if (!paymentId) {
    throw new Error("No se recibió el pago a confirmar.");
  }

  const projected = parseProjectedPlanId(paymentId);

  if (projected?.planType === "payment") {
    const { data: sourcePaymentRow, error: sourcePaymentError } = await supabase
      .from("payment_plans")
      .select("*")
      .eq("id", projected.sourceId)
      .single();

    if (sourcePaymentError) {
      throw new Error(sourcePaymentError.message);
    }

    const sourcePayment = paymentPlanRowToPaymentPlan(sourcePaymentRow);
    const paidAt = new Date().toISOString();
    const projectedDueDate = getProjectedDateInMonth(
      sourcePayment.dueDate,
      projected.month,
    );

    const { data: createdPaymentRow, error: createPaymentError } =
      await supabase
        .from("payment_plans")
        .insert({
          space_id: sourcePayment.spaceId,
          user_id: sourcePayment.userId,
          name: sourcePayment.name,
          amount: sourcePayment.amount,
          category: sourcePayment.category,
          kind: sourcePayment.kind,
          status: "paid",
          due_date: projectedDueDate,
          paid_at: paidAt,
          postponed_to: null,
          installment_number: sourcePayment.installmentNumber,
          installment_total: sourcePayment.installmentTotal,
          total_amount: sourcePayment.totalAmount,
          remaining_amount: sourcePayment.remainingAmount,
          notes: sourcePayment.notes,
        })
        .select("*")
        .single();

    if (createPaymentError) {
      if (isUniqueViolation(createPaymentError)) {
        revalidatePath("/payments");
        revalidatePath("/movements");
        revalidatePath("/dashboard");
        return;
      }

      throw new Error(createPaymentError.message);
    }

    const { error: movementError } = await supabase.from("movements").insert({
      space_id: createdPaymentRow.space_id,
      user_id: createdPaymentRow.user_id,
      type: "expense",
      name: createdPaymentRow.name,
      amount: Number(createdPaymentRow.amount),
      category: createdPaymentRow.category,
      occurred_on: projectedDueDate,
      is_fixed: createdPaymentRow.kind === "recurrent",
      visibility: "private",
      source_type: "payment_plan",
      source_payment_plan_id: createdPaymentRow.id,
      source_income_plan_id: null,
      source_label: "Desde Agenda",
      notes: createdPaymentRow.notes,
    });

    if (movementError && !isUniqueViolation(movementError)) {
      throw new Error(movementError.message);
    }

    revalidatePath("/payments");
    revalidatePath("/movements");
    revalidatePath("/dashboard");
    return;
  }

  const { data: paymentRow, error: paymentError } = await supabase
    .from("payment_plans")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const payment = paymentPlanRowToPaymentPlan(paymentRow);
  const result = markPaymentPlanAsPaid(payment);

  const { error: updateError } = await supabase
    .from("payment_plans")
    .update({
      status: result.updatedPayment.status,
      paid_at: result.updatedPayment.paidAt,
      remaining_amount: result.updatedPayment.remainingAmount,
    })
    .eq("id", payment.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: movementError } = await supabase
    .from("movements")
    .insert(movementDraftToInsert(result.movement));

  if (movementError) {
    throw new Error(movementError.message);
  }

  if (result.nextPaymentDraft) {
    const { error: nextPaymentError } = await supabase
      .from("payment_plans")
      .insert(paymentPlanDraftToInsert(result.nextPaymentDraft));

    if (nextPaymentError && !isUniqueViolation(nextPaymentError)) {
      throw new Error(nextPaymentError.message);
    }
  }

  revalidatePath("/payments");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

async function updatePendingPaymentAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();
  const paymentId = String(formData.get("paymentId") ?? "");

  if (!paymentId) {
    throw new Error("No se recibió el pago a editar.");
  }

  const kindValue = String(formData.get("kind") ?? "single");
  const kind =
    kindValue === "recurrent" || kindValue === "temporary"
      ? kindValue
      : "single";

  const amount = Number(formData.get("amount") ?? 0);
  const installmentTotalRaw = Number(formData.get("installmentTotal") ?? 0);
  const installmentTotal =
    kind === "temporary" && installmentTotalRaw > 0
      ? installmentTotalRaw
      : null;

  const totalAmount =
    kind === "temporary" && installmentTotal ? amount * installmentTotal : null;

  const notesValue = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase
    .from("payment_plans")
    .update({
      name: String(formData.get("name") ?? ""),
      amount,
      category: String(formData.get("category") ?? ""),
      kind,
      due_date: String(formData.get("dueDate") ?? todayValue()),
      installment_total: installmentTotal,
      total_amount: totalAmount,
      remaining_amount: totalAmount,
      notes: notesValue ? notesValue : null,
    })
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .neq("status", "paid");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
async function deletePendingPaymentAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();
  const paymentId = String(formData.get("paymentId") ?? "");

  if (!paymentId) {
    throw new Error("No se recibió el pago a eliminar.");
  }

  const { error } = await supabase
    .from("payment_plans")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .neq("status", "paid");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
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

  const { data: paymentRows, error: paymentsError } = await supabase
    .from("payment_plans")
    .select("*")
    .eq("space_id", space.id)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const payments = projectPaymentPlansForMonth(
    (paymentRows ?? []).map(paymentPlanRowToPaymentPlan),
    month,
  );

  const activePayments = payments.filter(isPaymentActive);
  const paidPayments = payments.filter((payment) => payment.status === "paid");

  const activeTotal = sumMoney(activePayments, (payment) => payment.amount);
  const paidTotal = sumMoney(paidPayments, (payment) => payment.amount);

  return (
    <AppShell active="payments" userEmail={user.email}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
              Planificación de salidas
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Agenda de pagos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Programa pagos únicos, recurrentes y cuotas. Al confirmar un pago,
              Brújula crea automáticamente un movimiento real.
            </p>
          </div>

          <PaymentPlanDialog action={createPaymentPlanAction} />
        </div>

        <div className="mb-6">
          <MonthSelector month={month} basePath="/payments" />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-200">Pendiente</p>
            <h2 className="mt-3 text-2xl font-semibold text-amber-100">
              {formatMoney(activeTotal)}
            </h2>
          </article>

          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm text-emerald-200">Pagado</p>
            <h2 className="mt-3 text-2xl font-semibold text-emerald-100">
              {formatMoney(paidTotal)}
            </h2>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Registros</p>
            <h2 className="mt-3 text-2xl font-semibold">{payments.length}</h2>
          </article>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <p className="text-sm text-slate-400">Lista del periodo</p>
            <h2 className="text-2xl font-semibold">Pagos planificados</h2>
          </div>

          {payments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-lg font-semibold">
                No hay pagos en este periodo
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Cambia de mes o crea un pago con fecha dentro de este periodo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const isProjected = isProjectedPlan(payment.id);
                const canMarkPaid = isPaymentActive(payment);
                const canEdit = payment.status !== "paid" && !isProjected;
                const canDelete = payment.status !== "paid" && !isProjected;

                return (
                  <article
                    key={payment.id}
                    className="rounded-3xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{payment.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {payment.category} · {payment.dueDate ?? "Sin fecha"} ·{" "}
                          {payment.kind === "recurrent"
                            ? "Recurrente"
                            : payment.kind === "temporary"
                              ? `Cuota ${payment.installmentNumber ?? 1}/${
                                  payment.installmentTotal ?? "?"
                                }`
                              : "Único"}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-amber-200">
                          {isProjected
                            ? "Programado recurrente"
                            : getPaymentDisplayStatus(payment)}
                        </p>
                        {payment.notes ? (
                          <p className="mt-2 text-sm text-slate-500">
                            {payment.notes}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {canMarkPaid ? (
                            <form action={markPaymentAsPaidAction}>
                              <input
                                type="hidden"
                                name="paymentId"
                                value={payment.id}
                              />
                              <button className="rounded-full border border-emerald-300/20 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/10">
                                Marcar pagado
                              </button>
                            </form>
                          ) : null}

                          {canEdit ? (
                            <EditPaymentPlanDialog
                              action={updatePendingPaymentAction}
                              payment={{
                                id: payment.id,
                                name: payment.name,
                                amount: payment.amount,
                                category: payment.category,
                                kind: payment.kind,
                                dueDate: payment.dueDate,
                                installmentTotal: payment.installmentTotal,
                                notes: payment.notes,
                              }}
                            />
                          ) : null}

                          {canDelete ? (
                            <ConfirmActionButton
                              action={deletePendingPaymentAction}
                              hiddenFields={[
                                {
                                  name: "paymentId",
                                  value: payment.id,
                                },
                              ]}
                              triggerLabel="Eliminar"
                              title="¿Eliminar este pago?"
                              description={`Vas a eliminar "${payment.name}" de tu agenda. Esta acción solo aplica para pagos pendientes o programados que todavía no han sido pagados.`}
                              confirmLabel="Sí, eliminar"
                              tone="danger"
                            />
                          ) : null}
                        </div>
                      </div>

                      <p className="text-right text-lg font-bold text-rose-300">
                        -{formatMoney(payment.amount)}
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



