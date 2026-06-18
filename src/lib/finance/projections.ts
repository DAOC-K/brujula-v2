import type { IncomePlan, PaymentPlan } from "@/types/finance";

import { getProjectedDateInMonth } from "./dates";

function getPlanMonth(dateValue: string | null) {
  return dateValue ? dateValue.slice(0, 7) : null;
}

function paymentKey(payment: PaymentPlan) {
  return [
    payment.spaceId,
    payment.name.trim().toLowerCase(),
    payment.category.trim().toLowerCase(),
    payment.amount,
    payment.kind,
  ].join("|");
}

function incomeKey(income: IncomePlan) {
  return [
    income.spaceId,
    income.name.trim().toLowerCase(),
    income.category.trim().toLowerCase(),
    income.amount,
    income.kind,
  ].join("|");
}

export function isProjectedPlan(id: string) {
  return id.startsWith("projection:");
}

export function projectPaymentPlansForMonth(
  payments: PaymentPlan[],
  month: string,
): PaymentPlan[] {
  const concretePayments = payments.filter(
    (payment) => getPlanMonth(payment.dueDate) === month,
  );

  const concreteKeys = new Set(concretePayments.map(paymentKey));
  const latestSourceByKey = new Map<string, PaymentPlan>();

  for (const payment of payments) {
    if (payment.kind !== "recurrent" || !payment.dueDate) {
      continue;
    }

    const paymentMonth = getPlanMonth(payment.dueDate);

    if (!paymentMonth || paymentMonth >= month) {
      continue;
    }

    const key = paymentKey(payment);

    if (concreteKeys.has(key)) {
      continue;
    }

    const currentLatest = latestSourceByKey.get(key);

    if (!currentLatest || payment.dueDate > (currentLatest.dueDate ?? "")) {
      latestSourceByKey.set(key, payment);
    }
  }

  const projectedPayments = Array.from(latestSourceByKey.values()).map(
    (payment) => ({
      ...payment,
      id: `projection:payment:${payment.id}:${month}`,
      status: "pending" as const,
      dueDate: getProjectedDateInMonth(payment.dueDate, month),
      paidAt: null,
      postponedTo: null,
      notes: payment.notes,
    }),
  );

  return [...concretePayments, ...projectedPayments].sort((a, b) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
  );
}

export function projectIncomePlansForMonth(
  incomes: IncomePlan[],
  month: string,
): IncomePlan[] {
  const concreteIncomes = incomes.filter(
    (income) => getPlanMonth(income.expectedDate) === month,
  );

  const concreteKeys = new Set(concreteIncomes.map(incomeKey));
  const latestSourceByKey = new Map<string, IncomePlan>();

  for (const income of incomes) {
    if (income.kind !== "recurrent" || !income.expectedDate) {
      continue;
    }

    const incomeMonth = getPlanMonth(income.expectedDate);

    if (!incomeMonth || incomeMonth >= month) {
      continue;
    }

    const key = incomeKey(income);

    if (concreteKeys.has(key)) {
      continue;
    }

    const currentLatest = latestSourceByKey.get(key);

    if (!currentLatest || income.expectedDate > (currentLatest.expectedDate ?? "")) {
      latestSourceByKey.set(key, income);
    }
  }

  const projectedIncomes = Array.from(latestSourceByKey.values()).map(
    (income) => ({
      ...income,
      id: `projection:income:${income.id}:${month}`,
      status: "expected" as const,
      expectedDate: getProjectedDateInMonth(income.expectedDate, month),
      receivedAt: null,
      notes: income.notes,
    }),
  );

  return [...concreteIncomes, ...projectedIncomes].sort((a, b) =>
    (a.expectedDate ?? "").localeCompare(b.expectedDate ?? ""),
  );
}

export function parseProjectedPlanId(id: string) {
  const [prefix, planType, sourceId, month] = id.split(":");

  if (prefix !== "projection" || !planType || !sourceId || !month) {
    return null;
  }

  return {
    planType,
    sourceId,
    month,
  };
}
