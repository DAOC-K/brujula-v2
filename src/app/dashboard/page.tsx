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

type OnboardingActionCardProps = {
  href: string;
  step: string;
  title: string;
  description: string;
  action: string;
};

function resolveMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return currentMonthValue();
  }

  return month;
}

function OnboardingActionCard({
  href,
  step,
  title,
  description,
  action,
}: OnboardingActionCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[1.4rem] border border-white/10 bg-black/20 p-4 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 lg:rounded-3xl lg:p-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300">
        {step}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <span className="mt-4 inline-flex rounded-full border border-emerald-300/20 px-3 py-1 text-xs font-semibold text-emerald-200 transition group-hover:bg-emerald-300 group-hover:text-slate-950">
        {action}
      </span>
    </Link>
  );
}

function FirstRunOnboarding({ month }: { month: string }) {
  return (
    <section className="mb-4 rounded-[1.6rem] border border-emerald-300/20 bg-emerald-300/10 p-4 shadow-2xl shadow-emerald-950/20 lg:mb-6 lg:rounded-[2rem] lg:p-6">
      <div className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-200">
          Primeros pasos
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">
          Bienvenido a Brújula
        </h2>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80">
          Tu espacio está limpio. Para que el dashboard empiece a darte una
          lectura real, completa estos pasos en orden. No tienes que hacerlo
          todo perfecto: solo necesitas registrar la base de tu mes.
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <OnboardingActionCard
          href={`/income?month=${month}`}
          step="Paso 1"
          title="Crea tu ingreso principal"
          description="Agrega tu salario, ingreso fijo o entrada esperada del mes."
          action="Crear ingreso"
        />

        <OnboardingActionCard
          href={`/payments?month=${month}`}
          step="Paso 2"
          title="Agrega tus pagos fijos"
          description="Registra arriendo, servicios, deudas, suscripciones o cuotas."
          action="Agregar pagos"
        />

        <OnboardingActionCard
          href={`/movements?month=${month}`}
          step="Paso 3"
          title="Registra gastos reales"
          description="Cuando gastes dinero fuera de la agenda, guárdalo como gasto manual."
          action="Registrar gasto"
        />

        <OnboardingActionCard
          href="/settings"
          step="Opcional"
          title="Configura tu presupuesto"
          description="Define un presupuesto mensual base para tener una referencia inicial."
          action="Configurar"
        />
      </div>
    </section>
  );
}

function EmptyMonthGuide({ month }: { month: string }) {
  return (
    <section className="mb-4 rounded-[1.6rem] border border-sky-300/20 bg-sky-300/10 p-4 shadow-2xl shadow-black/20 lg:mb-6 lg:rounded-[2rem] lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-200">
            Mes sin actividad
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            Este periodo todavía no tiene datos
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/80">
            Puedes crear ingresos esperados, agregar pagos o registrar un gasto
            real para que Brújula calcule el disponible de este mes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/income?month=${month}`}
            className="rounded-full bg-sky-300 px-4 py-2 text-sm font-bold text-slate-950"
          >
            Crear ingreso
          </Link>
          <Link
            href={`/payments?month=${month}`}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Agregar pago
          </Link>
        </div>
      </div>
    </section>
  );
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

  const rawMovementsCount = movementsResponse.data?.length ?? 0;
  const rawPaymentPlansCount = paymentPlansResponse.data?.length ?? 0;
  const rawIncomePlansCount = incomePlansResponse.data?.length ?? 0;

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

  const hasAnyFinancialData =
    rawMovementsCount + rawPaymentPlansCount + rawIncomePlansCount > 0;

  const hasMonthActivity =
    recentMovements.length > 0 ||
    upcomingPayments.length > 0 ||
    summary.realIncome > 0 ||
    summary.expectedIncome > 0 ||
    summary.realExpenses > 0 ||
    summary.pendingPayments > 0;

  const showFirstRunOnboarding =
    !hasAnyFinancialData && Number(space.monthly_budget) === 0;

  const showEmptyMonthGuide = hasAnyFinancialData && !hasMonthActivity;

  const recommendations = getDashboardRecommendations({
    availableEstimated: summary.availableEstimated,
    realIncome: summary.realIncome,
    expectedIncome: summary.expectedIncome,
    realExpenses: summary.realExpenses,
    pendingPayments: summary.pendingPayments,
  });

  return (
    <AppShell active="dashboard" userEmail={user.email}>
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-5 lg:mb-8">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300 lg:mb-3">
            Brújula V2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Inicio financiero
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Tu centro de control para movimientos reales, ingresos esperados,
            agenda de pagos y disponible estimado.
          </p>
        </div>

        <div className="mb-4 lg:mb-6">
          <MonthSelector month={month} basePath="/dashboard" />
        </div>

        {showFirstRunOnboarding ? <FirstRunOnboarding month={month} /> : null}
        {showEmptyMonthGuide ? <EmptyMonthGuide month={month} /> : null}

        <div className="mb-4 rounded-[1.6rem] border border-emerald-300/20 bg-emerald-300/10 p-4 shadow-2xl shadow-emerald-950/20 lg:mb-6 lg:rounded-[2rem] lg:p-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-200 lg:text-xs">
            Disponible estimado · {getMonthLabel(month)}
          </p>
          <h2
            className={`text-4xl font-bold tracking-tight lg:text-5xl ${
              summary.availableEstimated >= 0
                ? "text-emerald-100"
                : "text-rose-100"
            }`}
          >
            {formatMoney(summary.availableEstimated)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/80 lg:mt-4">
            Ingresos reales + ingresos esperados pendientes - gastos reales -
            pagos pendientes de agenda.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          <article className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-300/10 p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-emerald-200">Ingresos reales</p>
            <h3 className="mt-2 text-2xl font-semibold text-emerald-100">
              {formatMoney(summary.realIncome)}
            </h3>
          </article>

          <article className="rounded-[1.4rem] border border-sky-300/20 bg-sky-300/10 p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-sky-200">Ingresos esperados</p>
            <h3 className="mt-2 text-2xl font-semibold text-sky-100">
              {formatMoney(summary.expectedIncome)}
            </h3>
          </article>

          <article className="rounded-[1.4rem] border border-rose-300/20 bg-rose-300/10 p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-rose-200">Gastos reales</p>
            <h3 className="mt-2 text-2xl font-semibold text-rose-100">
              {formatMoney(summary.realExpenses)}
            </h3>
          </article>

          <article className="rounded-[1.4rem] border border-amber-300/20 bg-amber-300/10 p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-amber-200">Agenda pendiente</p>
            <h3 className="mt-2 text-2xl font-semibold text-amber-100">
              {formatMoney(summary.pendingPayments)}
            </h3>
          </article>

          <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-slate-400">Salud financiera</p>
            <h3 className="mt-2 text-2xl font-semibold">
              {summary.healthScore}/100
            </h3>
          </article>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-slate-400">Espacio principal</p>
            <h3 className="mt-2 text-2xl font-semibold">{space.name}</h3>
            <p className="mt-2 text-sm text-slate-300">
              Tipo: {space.type === "personal" ? "Personal" : "Compartido"}
            </p>
          </article>

          <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-slate-400">Presupuesto mensual</p>
            <h3 className="mt-2 text-2xl font-semibold">
              {formatMoney(Number(space.monthly_budget))}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Se usa como respaldo si no hay ingresos esperados.
            </p>
          </article>

          <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 lg:rounded-3xl lg:p-5">
            <p className="text-sm text-slate-400">Balance real</p>
            <h3
              className={`mt-2 text-2xl font-semibold ${
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

        <div className="mt-4 grid gap-4 xl:mt-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 lg:rounded-[2rem] lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4 lg:mb-5">
              <div>
                <p className="text-sm text-slate-400">Historial</p>
                <h2 className="text-xl font-semibold lg:text-2xl">
                  Actividad reciente
                </h2>
              </div>

              <Link
                href={`/movements?month=${month}`}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Ver todo
              </Link>
            </div>

            {recentMovements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-6 text-center lg:p-8">
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
                      className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4 lg:rounded-3xl"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold">{movement.name}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                            <span>{movement.category}</span>
                            <span>·</span>
                            <span>{movement.occurredOn}</span>
                            <MovementSourceBadge
                              sourceType={movement.sourceType}
                            />
                          </div>
                        </div>

                        <p
                          className={`text-left text-lg font-bold lg:text-right ${
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

          <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 lg:rounded-[2rem] lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-4 lg:mb-5">
              <div>
                <p className="text-sm text-slate-400">Agenda</p>
                <h2 className="text-xl font-semibold lg:text-2xl">
                  Próximos pagos
                </h2>
              </div>

              <Link
                href={`/payments?month=${month}`}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Ver agenda
              </Link>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-6 text-center lg:p-8">
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
                    className="rounded-[1.3rem] border border-amber-300/10 bg-amber-300/5 p-4 lg:rounded-3xl"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{payment.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {payment.category} · {payment.dueDate ?? "Sin fecha"}
                        </p>
                      </div>

                      <p className="text-left text-lg font-bold text-amber-200 lg:text-right">
                        {formatMoney(payment.amount)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-[1.6rem] border border-emerald-300/20 bg-emerald-300/10 p-4 shadow-2xl shadow-emerald-950/20 lg:mt-6 lg:rounded-[2rem] lg:p-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-200 lg:text-xs">
            Brújula recomienda
          </p>
          <div className="grid gap-3">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation}
                className="rounded-[1.3rem] border border-emerald-300/10 bg-black/20 p-4 text-sm leading-6 text-emerald-50/90 lg:rounded-3xl"
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
