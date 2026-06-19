export const dynamic = "force-dynamic";

import Link from "next/link";

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
import { formatMoney, sumMoney } from "@/lib/finance/money";
import {
  projectIncomePlansForMonth,
  projectPaymentPlansForMonth,
} from "@/lib/finance/projections";
import { requireUser } from "@/lib/supabase/auth";

type AssistantPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

type AssistantInsight = {
  title: string;
  description: string;
  tone: "success" | "warning" | "danger" | "info";
  actionLabel?: string;
  actionHref?: string;
};

function resolveMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return currentMonthValue();
  }

  return month;
}

function getInsightStyles(tone: AssistantInsight["tone"]) {
  const styles: Record<AssistantInsight["tone"], string> = {
    success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",
    warning: "border-amber-300/20 bg-amber-300/10 text-amber-50",
    danger: "border-rose-300/20 bg-rose-300/10 text-rose-50",
    info: "border-sky-300/20 bg-sky-300/10 text-sky-50",
  };

  return styles[tone];
}

function buildAssistantInsights({
  month,
  realIncome,
  expectedIncome,
  realExpenses,
  pendingPayments,
  availableEstimated,
  monthlyBudget,
  movementsCount,
}: {
  month: string;
  realIncome: number;
  expectedIncome: number;
  realExpenses: number;
  pendingPayments: number;
  availableEstimated: number;
  monthlyBudget: number;
  movementsCount: number;
}): AssistantInsight[] {
  const insights: AssistantInsight[] = [];

  if (availableEstimated < 0) {
    insights.push({
      title: "Tu disponible estimado está en negativo",
      description:
        "Antes de asumir nuevos gastos, revisa pagos pendientes y gastos manuales. El objetivo es que el mes vuelva a quedar por encima de cero.",
      tone: "danger",
      actionLabel: "Ver movimientos",
      actionHref: `/movements?month=${month}`,
    });
  }

  if (pendingPayments > 0) {
    insights.push({
      title: "Tienes pagos pendientes en Agenda",
      description:
        "Cuando el dinero salga realmente, márcalos como pagados. Así Brújula crea el movimiento real y mantiene limpio tu historial.",
      tone: "warning",
      actionLabel: "Ver agenda",
      actionHref: `/payments?month=${month}`,
    });
  }

  if (realIncome === 0 && expectedIncome === 0 && monthlyBudget > 0) {
    insights.push({
      title: "Este mes depende del presupuesto base",
      description:
        "No hay ingresos reales ni esperados para este periodo. Brújula está usando tu presupuesto mensual como respaldo. Lo ideal es crear ingresos esperados.",
      tone: "info",
      actionLabel: "Crear ingreso",
      actionHref: `/income?month=${month}`,
    });
  }

  if (realIncome === 0 && expectedIncome === 0 && monthlyBudget === 0) {
    insights.push({
      title: "Falta una base de ingresos",
      description:
        "Este periodo no tiene ingresos ni presupuesto base. Agrega ingresos esperados o configura tu presupuesto mensual para que el cálculo sea útil.",
      tone: "warning",
      actionLabel: "Configurar",
      actionHref: "/settings",
    });
  }

  if (realIncome > 0 && realExpenses / realIncome >= 0.7) {
    insights.push({
      title: "Tus gastos reales están altos frente a tus ingresos",
      description:
        "Tus gastos ya consumen más del 70% de tus ingresos reales del periodo. Conviene revisar gastos variables o pagos no esenciales.",
      tone: "warning",
      actionLabel: "Revisar movimientos",
      actionHref: `/movements?month=${month}`,
    });
  }

  if (movementsCount === 0) {
    insights.push({
      title: "Aún no hay movimientos reales en este periodo",
      description:
        "Los movimientos aparecen cuando confirmas ingresos, pagas obligaciones o registras gastos manuales. Ese historial es la base de las recomendaciones.",
      tone: "info",
      actionLabel: "Registrar gasto",
      actionHref: `/movements?month=${month}`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Tu periodo se ve estable",
      description:
        "No hay alertas fuertes por ahora. Mantén actualizados ingresos, agenda y movimientos para que Brújula siga leyendo bien tu situación financiera.",
      tone: "success",
      actionLabel: "Ver dashboard",
      actionHref: `/dashboard?month=${month}`,
    });
  }

  return insights;
}

export default async function AssistantPage({
  searchParams,
}: AssistantPageProps) {
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

  const monthlyMovements = movements.filter((movement) =>
    isSameMonth(movement.occurredOn, month),
  );

  const pendingPayments = paymentPlans.filter((payment) =>
    ["pending", "overdue", "postponed"].includes(payment.status),
  );

  const expectedIncomes = incomePlans.filter(
    (income) => income.status === "expected",
  );

  const expenseMovements = monthlyMovements.filter(
    (movement) => movement.type === "expense",
  );

  const topExpenseCategory = expenseMovements.reduce<Record<string, number>>(
    (acc, movement) => {
      acc[movement.category] = (acc[movement.category] ?? 0) + movement.amount;
      return acc;
    },
    {},
  );

  const topExpense = Object.entries(topExpenseCategory).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const insights = buildAssistantInsights({
    month,
    realIncome: summary.realIncome,
    expectedIncome: summary.expectedIncome,
    realExpenses: summary.realExpenses,
    pendingPayments: summary.pendingPayments,
    availableEstimated: summary.availableEstimated,
    monthlyBudget: Number(space.monthly_budget),
    movementsCount: monthlyMovements.length,
  });

  return (
    <AppShell active="assistant" userEmail={user.email}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Inteligencia financiera
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Asistente IA
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Análisis automático de tu periodo financiero. Por ahora Brújula usa
            reglas internas; más adelante conectaremos IA conversacional sobre
            tus datos.
          </p>
        </div>

        <div className="mb-6">
          <MonthSelector month={month} basePath="/assistant" />
        </div>

        <div className="mb-6 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6 shadow-2xl shadow-emerald-950/20">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">
            Lectura de Brújula · {getMonthLabel(month)}
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
          <p className="mt-4 max-w-3xl text-sm leading-6 text-emerald-100/80">
            Este es tu disponible estimado después de cruzar ingresos reales,
            ingresos esperados, gastos reales y pagos pendientes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm text-emerald-200">Ingresos reales</p>
            <h3 className="mt-3 text-2xl font-semibold text-emerald-100">
              {formatMoney(summary.realIncome)}
            </h3>
          </article>

          <article className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-5">
            <p className="text-sm text-rose-200">Gastos reales</p>
            <h3 className="mt-3 text-2xl font-semibold text-rose-100">
              {formatMoney(summary.realExpenses)}
            </h3>
          </article>

          <article className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-200">Pagos pendientes</p>
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              Recomendaciones
            </p>
            <h2 className="text-2xl font-semibold">
              Qué haría Brújula ahora
            </h2>

            <div className="mt-5 space-y-3">
              {insights.map((insight) => (
                <article
                  key={insight.title}
                  className={`rounded-3xl border p-4 ${getInsightStyles(
                    insight.tone,
                  )}`}
                >
                  <h3 className="font-semibold">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {insight.description}
                  </p>

                  {insight.actionHref && insight.actionLabel ? (
                    <Link
                      href={insight.actionHref}
                      className="mt-4 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold transition hover:bg-black/30"
                    >
                      {insight.actionLabel}
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <p className="text-sm text-slate-400">Riesgo principal</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {summary.pendingPayments > 0
                  ? "Pagos pendientes"
                  : summary.availableEstimated < 0
                    ? "Disponible negativo"
                    : "Sin alerta fuerte"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {summary.pendingPayments > 0
                  ? "Hay obligaciones pendientes que todavía pueden afectar tu disponible real."
                  : summary.availableEstimated < 0
                    ? "El periodo necesita ajuste porque el disponible estimado está por debajo de cero."
                    : "No se detecta una alerta crítica en este periodo."}
              </p>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <p className="text-sm text-slate-400">Mayor categoría de gasto</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {topExpense ? topExpense[0] : "Sin gastos"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {topExpense
                  ? `Esta categoría suma ${formatMoney(
                      topExpense[1],
                    )} en el periodo.`
                  : "Cuando registres gastos reales, Brújula identificará tus categorías más pesadas."}
              </p>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <p className="text-sm text-slate-400">Planificación pendiente</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {expectedIncomes.length + pendingPayments.length} elementos
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {expectedIncomes.length} ingresos esperados y{" "}
                {pendingPayments.length} pagos pendientes para este periodo.
              </p>
            </article>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
