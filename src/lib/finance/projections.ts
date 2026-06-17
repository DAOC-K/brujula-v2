import type { IncomePlan, PaymentPlan } from "@/types/finance";

import { getProjectedDateInMonth, isSameMonth } from "./dates";

export type ProjectedPaymentPlan = PaymentPlan & {
  isProjected: boolean;
  projectionSourceId: string | null;
};

export type ProjectedIncomePlan = IncomePlan & {
  isProjected: boolean;
  projectionSourceId: string | null;
};

function getMonthValue(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  return dateValue.slice(0, 7);
}

function hasPlanStarted(dateValue: string | null, month: string) {
  const startMonth = getMonthValue(dateValue);

  if (!startMonth) {
    return false;
  }

  return startMonth <= month;
}

function paymentMatchesProjection(
  payment: PaymentPlan,
  source: PaymentPlan,
  month: string,
) {
  return Boolean(
    payment.id !== source.id &&
      payment.kind === source.kind &&
      payment.name === source.name &&
      payment.category === source.category &&
      Number(payment.amount) === Number(source.amount) &&
      payment.dueDate &&
      isSameMonth(payment.dueDate, month),
  );
}

function incomeMatchesProjection(
  income: IncomePlan,
  source: IncomePlan,
  month: string,
) {
  return Boolean(
    income.id !== source.id &&
      income.kind === source.kind &&
      income.name === source.name &&
      income.category === source.category &&
      Number(income.amount) === Number(source.amount) &&
      income.expectedDate &&
      isSameMonth(income.expectedDate, month),
  );
}

function shouldProjectPayment(
  source: PaymentPlan,
  allPayments: PaymentPlan[],
  month: string,
) {
  if (source.kind !== "recurrent") {
    return false;
  }

  if (!source.dueDate) {
    return false;
  }

  if (!hasPlanStarted(source.dueDate, month)) {
    return false;
  }

  if (isSameMonth(source.dueDate, month)) {
    return false;
  }

  const alreadyExists = allPayments.some((payment) =>
    paymentMatchesProjection(payment, source, month),
  );

  return !alreadyExists;
}

function shouldProjectIncome(
  source: IncomePlan,
  allIncomes: IncomePlan[],
  month: string,
) {
  if (source.kind !== "recurrent") {
    return false;
  }

  if (!source.expectedDate) {
    return false;
  }

  if (!hasPlanStarted(source.expectedDate, month)) {
    return false;
  }

  if (isSameMonth(source.expectedDate, month)) {
    return false;
  }

  const alreadyExists = allIncomes.some((income) =>
    incomeMatchesProjection(income, source, month),
  );

  return !alreadyExists;
}

function projectPaymentForMonth(
  payment: PaymentPlan,
  month: string,
): ProjectedPaymentPlan {
  return {
    ...payment,
    id: `${payment.id}:projected:${month}`,
    status: "pending",
    dueDate: getProjectedDateInMonth(payment.dueDate, month),
    paidAt: null,
    postponedTo: null,
    isProjected: true,
    projectionSourceId: payment.id,
  };
}

function projectIncomeForMonth(
  income: IncomePlan,
  month: string,
): ProjectedIncomePlan {
  return {
    ...income,
    id: `${income.id}:projected:${month}`,
    status: "expected",
    expectedDate: getProjectedDateInMonth(income.expectedDate, month),
    receivedAt: null,
    isProjected: true,
    projectionSourceId: income.id,
  };
}

export function buildMonthlyPaymentPlans(
  payments: PaymentPlan[],
  month: string,
): ProjectedPaymentPlan[] {
  const realPaymentsForMonth: ProjectedPaymentPlan[] = payments
    .filter((payment) => payment.dueDate && isSameMonth(payment.dueDate, month))
    .map((payment) => ({
      ...payment,
      isProjected: false,
      projectionSourceId: null,
    }));

  const projectedPayments: ProjectedPaymentPlan[] = payments
    .filter((payment) => shouldProjectPayment(payment, payments, month))
    .map((payment) => projectPaymentForMonth(payment, month));

  return [...realPaymentsForMonth, ...projectedPayments].sort((a, b) => {
    const dateA = a.dueDate ?? "";
    const dateB = b.dueDate ?? "";

    return dateA.localeCompare(dateB);
  });
}

export function buildMonthlyIncomePlans(
  incomes: IncomePlan[],
  month: string,
): ProjectedIncomePlan[] {
  const realIncomesForMonth: ProjectedIncomePlan[] = incomes
    .filter((income) => income.expectedDate && isSameMonth(income.expectedDate, month))
    .map((income) => ({
      ...income,
      isProjected: false,
      projectionSourceId: null,
    }));

  const projectedIncomes: ProjectedIncomePlan[] = incomes
    .filter((income) => shouldProjectIncome(income, incomes, month))
    .map((income) => projectIncomeForMonth(income, month));

  return [...realIncomesForMonth, ...projectedIncomes].sort((a, b) => {
    const dateA = a.expectedDate ?? "";
    const dateB = b.expectedDate ?? "";

    return dateA.localeCompare(dateB);
  });
}

export function isProjectedPayment(
  payment: PaymentPlan | ProjectedPaymentPlan,
): payment is ProjectedPaymentPlan {
  return "isProjected" in payment && payment.isProjected;
}

export function isProjectedIncome(
  income: IncomePlan | ProjectedIncomePlan,
): income is ProjectedIncomePlan {
  return "isProjected" in income && income.isProjected;
}
