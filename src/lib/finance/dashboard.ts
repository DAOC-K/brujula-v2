import type { DashboardSummary, MonthlyContext } from "@/types/finance";

import { isSameMonth } from "./dates";
import { sumMoney } from "./money";

function getHealthScore(availableEstimated: number, incomeBase: number) {
  if (incomeBase <= 0) {
    return availableEstimated >= 0 ? 80 : 30;
  }

  const ratio = availableEstimated / incomeBase;

  if (ratio >= 0.4) return 100;
  if (ratio >= 0.25) return 90;
  if (ratio >= 0.1) return 75;
  if (ratio >= 0) return 60;

  return 30;
}

export function buildDashboardSummary(context: MonthlyContext): DashboardSummary {
  const space = context.spaces[0];
  const monthlyBudget = space?.monthlyBudget ?? 0;

  const monthlyMovements = context.movements.filter((movement) =>
    isSameMonth(movement.occurredOn, context.month),
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
    context.incomePlans.filter(
      (income) =>
        income.status === "expected" &&
        isSameMonth(income.expectedDate, context.month),
    ),
    (income) => income.amount,
  );

  const pendingPayments = sumMoney(
    context.paymentPlans.filter(
      (payment) =>
        ["pending", "overdue", "postponed"].includes(payment.status) &&
        isSameMonth(payment.dueDate, context.month),
    ),
    (payment) => payment.amount,
  );

  const hasPlannedOrRealIncome = realIncome > 0 || expectedIncome > 0;

  const fallbackBudget = hasPlannedOrRealIncome ? 0 : monthlyBudget;

  const incomeBase = realIncome + expectedIncome + fallbackBudget;
  const agendaImpact = pendingPayments;
  const movementBalance = realIncome - realExpenses;
  const availableEstimated = incomeBase - realExpenses - pendingPayments;

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
    healthScore: getHealthScore(availableEstimated, incomeBase),
  };
}
