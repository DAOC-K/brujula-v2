import { revalidatePath } from "next/cache";

import { MonthSelector } from "@/components/finance/month-selector";
import { AppShell } from "@/components/layout/app-shell";
import {
  currentMonthValue,
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
  isProjectedPlan,
  projectPaymentPlansForMonth,
} from "@/lib/finance/projections";
import {
  buildPaymentPlan,
  getPaymentDisplayStatus,
  isPaymentActive,
  markPaymentPlanAsPaid,
} from "@/lib/finance/payments";
import { requireUser } from "@/lib/supabase/auth";

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

    if (nextPaymentError) {
      throw new Error(nextPaymentError.message);
    }
  }

  revalidatePath("/payments");
  revalidatePath("/movements");
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
  const nextMonth = shiftMonth(month, 1);

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
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Planificación de salidas
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Agenda de pagos
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Aquí planeas pagos únicos, recurrentes y cuotas. Al confirmar un
            pago, Brújula crea automáticamente un movimiento real.
          </p>

          <form action={createPaymentPlanAction} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Tipo de pago
              </label>
              <select
                name="kind"
                defaultValue="single"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              >
                <option value="single">Único</option>
                <option value="recurrent">Recurrente</option>
                <option value="temporary">Cuotas / temporal</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Nombre
              </label>
              <input
                name="name"
                required
                placeholder="Ej: Internet, arriendo, tarjeta"
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
                placeholder="144000"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                En cuotas, este es el valor de cada cuota.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Categoría
              </label>
              <input
                name="category"
                required
                placeholder="Ej: Servicios, vivienda, deuda"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Fecha programada
              </label>
              <input
                name="dueDate"
                type="date"
                defaultValue={todayValue()}
                required
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Número de cuotas
              </label>
              <input
                name="installmentTotal"
                type="number"
                min="1"
                step="1"
                placeholder="Solo si es pago por cuotas"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
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
              Guardar en agenda
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <MonthSelector month={month} basePath="/payments" />

          <div className="grid gap-4 md:grid-cols-3">
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
              <h2 className="mt-3 text-2xl font-semibold">
                {payments.length}
              </h2>
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
                  const canMarkPaid = isPaymentActive(payment) && !isProjected;
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

                            {canDelete ? (
                              <form action={deletePendingPaymentAction}>
                                <input
                                  type="hidden"
                                  name="paymentId"
                                  value={payment.id}
                                />
                                <button className="rounded-full border border-rose-300/20 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10">
                                  Eliminar
                                </button>
                              </form>
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
        </div>
      </section>
    </AppShell>
  );
}

