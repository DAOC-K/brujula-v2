export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { MonthSelector } from "@/components/finance/month-selector";
import { buildDashboardSummary } from "@/lib/finance/dashboard";
import { currentMonthValue, getMonthLabel } from "@/lib/finance/dates";
import {
  financialSpaceRowToFinancialSpace,
  incomePlanRowToIncomePlan,
  movementRowToMovement,
  paymentPlanRowToPaymentPlan,
} from "@/lib/finance/mappers";
import { formatMoney } from "@/lib/finance/money";
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
        .order("occurred_on", { ascending: false }),
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

  const summary = buildDashboardSummary({
    month,
    spaces: [financialSpaceRowToFinancialSpace(space)],
    movements: (movementsResponse.data ?? []).map(movementRowToMovement),
    paymentPlans: (paymentPlansResponse.data ?? []).map(paymentPlanRowToPaymentPlan),
    incomePlans: (incomePlansResponse.data ?? []).map(incomePlanRowToIncomePlan),
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
      </section>
    </AppShell>
  );
}
