export const dynamic = "force-dynamic";

import Link from "next/link";

import { MovementSourceBadge } from "@/components/finance/finance-badge";
import { MonthSelector } from "@/components/finance/month-selector";
import { AppShell } from "@/components/layout/app-shell";
import { buildDashboardSummary } from "@/lib/finance/dashboard";
import {
  currentMonthValue,
  getMonthLabel,
  isSameMonth,
} from "@/lib/finance/dates";
import {
  financialSpaceRowToFinancialSpace,
  incomePlanRowToIncomePlan,
  movementRowToMovement,
  paymentPlanRowToPaymentPlan,
} from "@/lib/finance/mappers";
import { formatMoney } from "@/lib/finance/money";
import { getMovementDisplaySource } from "@/lib/finance/movements";
import {
  projectIncomePlansForMonth,
  projectPaymentPlansForMonth,
} from "@/lib/finance/projections";
import { requireUser } from "@/lib/supabase/auth";

type DashboardPageProps = {
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

function getDashboardRecommendations({
  availableEstimated,
  realIncome,
  expectedIncome,
  realExpenses,
  pendingPayments,
}: {
  availableEstimated: number;
  realIncome: number;
  expectedIncome: number;
  realExpenses: number;
  pendingPayments: number;
}) {
  const recommendations: string[] = [];

  if (availableEstimated < 0) {
    recommendations.push(
      "Tu disponible estimado está negativo. Revisa pagos pendientes o gastos reales antes de asumir nuevos compromisos.",
    );
  }

  if (pendingPayments > 0) {
    recommendations.push(
      "Tienes pagos pendientes en Agenda. Confirma los pagos cuando realmente salgan de tu dinero para mantener el historial limpio.",
    );
  }

  if (realIncome === 0 && expectedIncome === 0) {
    recommendations.push(
      "Este periodo no tiene ingresos reales ni ingresos esperados. Puedes crear un ingreso esperado o usar el presupuesto mensual como respaldo.",
    );
  }

  if (realIncome > 0 && realExpenses > realIncome * 0.7) {
    recommendations.push(
      "Tus gastos reales ya consumen una parte alta de tus ingresos. Conviene revisar gastos variables del mes.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Tu periodo se ve estable. Mantén Agenda e Ingresos actualizados para que Brújula siga calculando bien tu disponible.",
    );
  }

  return recommendations;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
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
    throw new Error("No se encontró un espacio financiero activo.");
  }

  const [movementsResponse, paymentPlansResponse, incomePlansResponse] =
    await Promise.all([
      supabase
        .from("movements")
        .select("*")
        .eq("space_id", space.id)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_plans")
        .select("*")
        .eq("space_id", space.id)
        .order("due_date", { ascending: true }),
      supabase
        .from("income_plans")
        .select("*")
        .eq("space_id", space.id)
        .order("expected_date", { ascending: true }),
    ]);

  if (movementsResponse.error) {
    throw new Error(movementsResponse.error.message);
  }

  if (paymentPlansResponse.error) {
    throw new Error(paymentPlansResponse.error.message);
  }

  if (incomePlansResponse.error) {
    throw new Error(incomePlansResponse.error.message);
  }

  const movements = (movementsResponse.data ?? []).map(movementRowToMovement);

  const paymentPlans = projectPaymentPlansForMonth(
    (paymentPlansResponse.data ?? []).map(paymentPlanRowToPaymentPlan),
    month,
  );

  const incomePlans = projectIncomePlansForMonth(
    (incomePlansResponse.data ?? []).map(incomePlanRowToIncomePlan),
    month,
  );

  const summary = buildDashboardSummary({
    month,
    spaces: [financialSpaceRowToFinancialSpace(space)],
    movements,
    paymentPlans,
    incomePlans,
  });

  const recentMovements = movements
    .filter((movement) => isSameMonth(movement.occurredOn, month))
    .slice(0, 5);

  const upcomingPayments = paymentPlans
    .filter((payment) =>
      ["pending", "overdue", "postponed"].includes(payment.status),
    )
    .slice(0, 5);

  const recommendations = getDashboardRecommendations({
    availableEstimated: summary.availableEstimated,
    realIncome: summary.realIncome,
    expectedIncome: summary.expectedIncome,
    realExpenses: summary.realExpenses,
    pendingPayments: summary.pendingPayments,
  });

  return (
    <AppShell active="dashboard" userEmail={user.email}>
      <section className="mx-auto max-w-6xl">
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

        <div className="mb-6">
          <MonthSelector month={month} basePath="/dashboard" />
        </div>

        <div className="mb-6 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6 shadow-2xl shadow-emerald-950/20">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">
            Disponible estimado · {getMonthLabel(month)}
          </p>
          <h2
            className={`text-5xl font-bold tracking-tight ${
              summary.availableEstimated >= 0
                ? "text-emerald-100"
                : "text-rose-100"
            }`}
          >
            {formatMoney(summary.availableEstimated)}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-100/80">
            Ingresos reales + ingresos esperados pendientes - gastos reales -
            pagos pendientes de agenda.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm text-emerald-200">Ingresos reales</p>
            <h3 className="mt-3 text-2xl font-semibold text-emerald-100">
              {formatMoney(summary.realIncome)}
            </h3>
          </article>

          <article className="rounded-3xl border border-sky-300/20 bg-sky-300/10 p-5">
            <p className="text-sm text-sky-200">Ingresos esperados</p>
            <h3 className="mt-3 text-2xl font-semibold text-sky-100">
              {formatMoney(summary.expectedIncome)}
            </h3>
          </article>

          <article className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-5">
            <p className="text-sm text-rose-200">Gastos reales</p>
            <h3 className="mt-3 text-2xl font-semibold text-rose-100">
              {formatMoney(summary.realExpenses)}
            </h3>
          </article>

          <article className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-200">Agenda pendiente</p>
            <h3 className="mt-3 text-2xl font-semibold text-amber-100">
              {formatMoney(summary.pendingPayments)}
            </h3>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Salud financiera</p>
            <h3 className="mt-3 text-2xl font-semibold">
              {summary.healthScore}/100
            </h3>
          </article>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Espacio principal</p>
            <h3 className="mt-3 text-2xl font-semibold">{space.name}</h3>
            <p className="mt-2 text-sm text-slate-300">
              Tipo: {space.type === "personal" ? "Personal" : "Compartido"}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Presupuesto mensual</p>
            <h3 className="mt-3 text-2xl font-semibold">
              {formatMoney(Number(space.monthly_budget))}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Se usa como respaldo si no hay ingresos esperados.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Balance real</p>
            <h3
              className={`mt-3 text-2xl font-semibold ${
                summary.movementBalance >= 0
                  ? "text-emerald-200"
                  : "text-rose-200"
              }`}
            >
              {formatMoney(summary.movementBalance)}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Ingresos reales menos gastos reales.
            </p>
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Historial</p>
                <h2 className="text-2xl font-semibold">
                  Actividad reciente
                </h2>
              </div>

              <Link
                href={`/movements?month=${month}`}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Ver todo
              </Link>
            </div>

            {recentMovements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
                <p className="font-semibold">Sin movimientos en este periodo</p>
                <p className="mt-2 text-sm text-slate-400">
                  Los pagos confirmados, ingresos recibidos y gastos manuales
                  aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMovements.map((movement) => {
                  const isIncome = movement.type === "income";

                  return (
                    <article
                      key={movement.id}
                      className="rounded-3xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{movement.name}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                            <span>{movement.category}</span>
                            <span>·</span>
                            <span>{movement.occurredOn}</span>
                            <MovementSourceBadge sourceType={movement.sourceType} />
                          </div>
                        </div>

                        <p
                          className={`text-right text-lg font-bold ${
                            isIncome ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatMoney(movement.amount)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Agenda</p>
                <h2 className="text-2xl font-semibold">
                  Próximos pagos
                </h2>
              </div>

              <Link
                href={`/payments?month=${month}`}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Ver agenda
              </Link>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
                <p className="font-semibold">Sin pagos pendientes</p>
                <p className="mt-2 text-sm text-slate-400">
                  Tu agenda del periodo no tiene salidas pendientes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPayments.map((payment) => (
                  <article
                    key={payment.id}
                    className="rounded-3xl border border-amber-300/10 bg-amber-300/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{payment.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {payment.category} · {payment.dueDate ?? "Sin fecha"}
                        </p>
                      </div>

                      <p className="text-right text-lg font-bold text-amber-200">
                        {formatMoney(payment.amount)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6 shadow-2xl shadow-emerald-950/20">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">
            Brújula recomienda
          </p>
          <div className="grid gap-3">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation}
                className="rounded-3xl border border-emerald-300/10 bg-black/20 p-4 text-sm leading-6 text-emerald-50/90"
              >
                {recommendation}
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

