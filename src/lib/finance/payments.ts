import type {
  PaymentPlan,
  PaymentPlanStatus,
  PlanKind,
} from "@/types/finance";

import { todayValue } from "./dates";
import { toMoneyNumber } from "./money";
import {
  buildMovementFromPaymentPlan,
  type MovementDraft,
} from "./movements";

export type PaymentPlanDraft = Omit<
  PaymentPlan,
  "id" | "createdAt" | "updatedAt"
>;

export type PaymentPlanInput = {
  spaceId: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  kind: PlanKind;
  dueDate?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  totalAmount?: number | null;
  remainingAmount?: number | null;
  notes?: string | null;
};

export type PaidPaymentResult = {
  updatedPayment: PaymentPlan;
  movement: MovementDraft;
  nextPaymentDraft: PaymentPlanDraft | null;
};

function cleanText(value: string) {
  return value.trim();
}

function normalizeAmount(value: number) {
  const amount = toMoneyNumber(value);

  if (amount < 0) {
    return Math.abs(amount);
  }

  return amount;
}

function addOneMonth(dateValue: string | null) {
  const safeDate = dateValue ?? todayValue();
  const [year, month, day] = safeDate.split("-").map(Number);

  if (!year || !month || !day) {
    return todayValue();
  }

  const next = new Date(year, month, 1);
  const nextYear = next.getFullYear();
  const nextMonth = next.getMonth() + 1;
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const safeDay = Math.min(day, lastDay);

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(
    safeDay,
  ).padStart(2, "0")}`;
}

function assertPaymentPlanIsValid(payment: PaymentPlanDraft | PaymentPlan) {
  if (!payment.spaceId) {
    throw new Error("El pago necesita un espacio financiero.");
  }

  if (!payment.userId) {
    throw new Error("El pago necesita un usuario.");
  }

  if (!payment.name.trim()) {
    throw new Error("El pago necesita un nombre.");
  }

  if (payment.amount <= 0) {
    throw new Error("El pago debe tener un valor mayor a cero.");
  }

  if (!payment.category.trim()) {
    throw new Error("El pago necesita una categoría.");
  }

  if (!payment.dueDate) {
    throw new Error("El pago necesita una fecha programada.");
  }

  if (payment.kind === "temporary") {
    if (
      payment.installmentNumber !== null &&
      payment.installmentNumber <= 0
    ) {
      throw new Error("El número de cuota debe ser mayor a cero.");
    }

    if (
      payment.installmentTotal !== null &&
      payment.installmentTotal <= 0
    ) {
      throw new Error("El total de cuotas debe ser mayor a cero.");
    }

    if (
      payment.installmentNumber !== null &&
      payment.installmentTotal !== null &&
      payment.installmentNumber > payment.installmentTotal
    ) {
      throw new Error("La cuota actual no puede superar el total de cuotas.");
    }
  }
}

export function buildPaymentPlan(input: PaymentPlanInput): PaymentPlanDraft {
  const isTemporary = input.kind === "temporary";

  const payment: PaymentPlanDraft = {
    spaceId: input.spaceId,
    userId: input.userId,
    name: cleanText(input.name),
    amount: normalizeAmount(input.amount),
    category: cleanText(input.category),
    kind: input.kind,
    status: "pending",
    dueDate: input.dueDate ?? todayValue(),
    paidAt: null,
    postponedTo: null,
    installmentNumber: isTemporary ? input.installmentNumber ?? 1 : null,
    installmentTotal: isTemporary ? input.installmentTotal ?? null : null,
    totalAmount: isTemporary ? input.totalAmount ?? null : null,
    remainingAmount: isTemporary
      ? input.remainingAmount ?? input.totalAmount ?? null
      : null,
    notes: input.notes ?? null,
  };

  assertPaymentPlanIsValid(payment);

  return payment;
}

export function getPaymentEffectiveDate(payment: PaymentPlan) {
  if (payment.status === "postponed" && payment.postponedTo) {
    return payment.postponedTo;
  }

  return payment.dueDate;
}

export function isPaymentPaid(payment: PaymentPlan) {
  return payment.status === "paid";
}

export function isPaymentOmitted(payment: PaymentPlan) {
  return payment.status === "omitted";
}

export function isPaymentActive(payment: PaymentPlan) {
  const activeStatuses: PaymentPlanStatus[] = [
    "pending",
    "overdue",
    "postponed",
  ];

  return activeStatuses.includes(payment.status);
}

export function isPaymentOverdue(
  payment: PaymentPlan,
  today = todayValue(),
) {
  const effectiveDate = getPaymentEffectiveDate(payment);

  return Boolean(
    effectiveDate &&
      isPaymentActive(payment) &&
      effectiveDate < today,
  );
}

export function isPaymentPendingForMonth(
  payment: PaymentPlan,
  month: string,
) {
  const effectiveDate = getPaymentEffectiveDate(payment);

  return Boolean(
    effectiveDate &&
      isPaymentActive(payment) &&
      effectiveDate.slice(0, 7) === month,
  );
}

function calculateRemainingAfterPayment(payment: PaymentPlan) {
  if (payment.kind !== "temporary" || payment.remainingAmount === null) {
    return payment.remainingAmount;
  }

  return Math.max(
    toMoneyNumber(payment.remainingAmount) - toMoneyNumber(payment.amount),
    0,
  );
}

function buildNextInstallmentPayment(
  payment: PaymentPlan,
): PaymentPlanDraft | null {
  if (payment.kind !== "temporary") {
    return null;
  }

  if (!payment.installmentNumber || !payment.installmentTotal) {
    return null;
  }

  if (payment.installmentNumber >= payment.installmentTotal) {
    return null;
  }

  const remainingAmount = toMoneyNumber(payment.remainingAmount);

  if (remainingAmount <= 0) {
    return null;
  }

  const nextAmount = Math.min(toMoneyNumber(payment.amount), remainingAmount);

  return buildPaymentPlan({
    spaceId: payment.spaceId,
    userId: payment.userId,
    name: payment.name,
    amount: nextAmount,
    category: payment.category,
    kind: "temporary",
    dueDate: addOneMonth(payment.dueDate),
    installmentNumber: payment.installmentNumber + 1,
    installmentTotal: payment.installmentTotal,
    totalAmount: payment.totalAmount,
    remainingAmount,
    notes: payment.notes,
  });
}

export function markPaymentPlanAsPaid(
  payment: PaymentPlan,
  paidAt = new Date().toISOString(),
): PaidPaymentResult {
  const remainingAmount = calculateRemainingAfterPayment(payment);

  const updatedPayment: PaymentPlan = {
    ...payment,
    status: "paid",
    paidAt,
    remainingAmount,
    updatedAt: paidAt,
  };

  assertPaymentPlanIsValid(updatedPayment);

  const movement = buildMovementFromPaymentPlan(updatedPayment);
  const nextPaymentDraft = buildNextInstallmentPayment(updatedPayment);

  return {
    updatedPayment,
    movement,
    nextPaymentDraft,
  };
}

export function postponePaymentPlan(
  payment: PaymentPlan,
  postponedTo: string,
) {
  if (!postponedTo) {
    throw new Error("Debes indicar la nueva fecha del pago.");
  }

  const updatedPayment: PaymentPlan = {
    ...payment,
    status: "postponed",
    postponedTo,
    updatedAt: new Date().toISOString(),
  };

  assertPaymentPlanIsValid(updatedPayment);

  return updatedPayment;
}

export function omitPaymentPlan(payment: PaymentPlan) {
  const updatedPayment: PaymentPlan = {
    ...payment,
    status: "omitted",
    updatedAt: new Date().toISOString(),
  };

  assertPaymentPlanIsValid(updatedPayment);

  return updatedPayment;
}

export function getPaymentDisplayStatus(payment: PaymentPlan) {
  if (payment.status === "paid") {
    return "Pagado";
  }

  if (payment.status === "omitted") {
    return "Omitido";
  }

  if (payment.status === "postponed") {
    return "Pospuesto";
  }

  if (isPaymentOverdue(payment)) {
    return "Vencido";
  }

  return "Pendiente";
}
