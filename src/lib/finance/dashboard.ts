import type {
  DashboardSummary,
  IncomePlan,
  MonthlyContext,
  Movement,
  PaymentPlan,
} from "@/types/finance";

import { isSameMonth } from "./dates";
import { sumMoney } from "./money";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isMovementInMonth(movement: Movement, month: string) {
  return isSameMonth(movement.occurredOn, month);
}

function isExpectedIncomeInMonth(income: IncomePlan, month: string) {
  return income.status === "expected" && isSameMonth(income.expectedDate, month);
}

function getPaymentEffectiveDate(payment: PaymentPlan) {
  if (payment.status === "postponed" && payment.postponedTo) {
    return payment.postponedTo;
  }

  return payment.dueDate;
}

function isPendingPaymentInMonth(payment: PaymentPlan, month: string) {
  const activeStatuses: PaymentPlan["status"][] = [
    "pending",
    "overdue",
    "postponed",
  ];

  return (
    activeStatuses.includes(payment.status) &&
    isSameMonth(getPaymentEffectiveDate(payment), month)
  );
}

function calculateHealthScore(params: {
  incomeBase: number;
  realExpenses: number;
  pendingPayments: number;
  availableEstimated: number;
}) {
  const { incomeBase, realExpenses, pendingPayments, availableEstimated } =
    params;

  if (incomeBase <= 0) {
    return availableEstimated >= 0 ? 80 : 30;
  }

  const committedRatio = (realExpenses + pendingPayments) / incomeBase;
  const availableRatio = availableEstimated / incomeBase;

  const score = 100 - committedRatio * 70 + availableRatio * 30;

  return Math.round(clamp(score, 0, 100));
}

export function buildDashboardSummary(context: MonthlyContext): DashboardSummary {
  const monthlyMovements = context.movements.filter((movement) =>
    isMovementInMonth(movement, context.month),
  );

  const realIncome = sumMoney(
    monthlyMovements.filter((movement) => movement.type === "income"),
    (movement) => movement.amount,
  );

  const realExpenses = sumMoney(
    monthlyMovements.filter((movement) => movement.type === "expense"),
    (movement) => movement.amount,
  );

  const expectedIncome = sumMoney(
    context.incomePlans.filter((income) =>
      isExpectedIncomeInMonth(income, context.month),
    ),
    (income) => income.amount,
  );

  const pendingPayments = sumMoney(
    context.paymentPlans.filter((payment) =>
      isPendingPaymentInMonth(payment, context.month),
    ),
    (payment) => payment.amount,
  );

  const monthlyBudgetFallback = sumMoney(
    context.spaces,
    (space) => space.monthlyBudget,
  );

  const plannedIncomeBase =
    expectedIncome > 0 ? expectedIncome : monthlyBudgetFallback;

  const incomeBase = realIncome + plannedIncomeBase;
  const agendaImpact = pendingPayments;
  const movementBalance = realIncome - realExpenses;

  const availableEstimated =
    realIncome + plannedIncomeBase - realExpenses - pendingPayments;

  const healthScore = calculateHealthScore({
    incomeBase,
    realExpenses,
    pendingPayments,
    availableEstimated,
  });

  return {
    month: context.month,
    realIncome,
    expectedIncome,
    realExpenses,
    pendingPayments,
    availableEstimated,
    incomeBase,
    agendaImpact,
    movementBalance,
    healthScore,
  };
}
