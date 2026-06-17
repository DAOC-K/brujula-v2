import type {
  IncomePlan,
  IncomePlanStatus,
  PlanKind,
} from "@/types/finance";

import { todayValue } from "./dates";
import { toMoneyNumber } from "./money";
import {
  buildMovementFromIncomePlan,
  type MovementDraft,
} from "./movements";

export type IncomePlanDraft = Omit<
  IncomePlan,
  "id" | "createdAt" | "updatedAt"
>;

export type IncomePlanInput = {
  spaceId: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  kind: PlanKind;
  expectedDate?: string | null;
  notes?: string | null;
};

export type ReceivedIncomeResult = {
  updatedIncome: IncomePlan;
  movement: MovementDraft;
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

function assertIncomePlanIsValid(income: IncomePlanDraft | IncomePlan) {
  if (!income.spaceId) {
    throw new Error("El ingreso necesita un espacio financiero.");
  }

  if (!income.userId) {
    throw new Error("El ingreso necesita un usuario.");
  }

  if (!income.name.trim()) {
    throw new Error("El ingreso necesita un nombre.");
  }

  if (income.amount <= 0) {
    throw new Error("El ingreso debe tener un valor mayor a cero.");
  }

  if (!income.category.trim()) {
    throw new Error("El ingreso necesita una categoría.");
  }

  if (!income.expectedDate && income.status === "expected") {
    throw new Error("El ingreso esperado necesita una fecha estimada.");
  }
}

export function buildIncomePlan(input: IncomePlanInput): IncomePlanDraft {
  const income: IncomePlanDraft = {
    spaceId: input.spaceId,
    userId: input.userId,
    name: cleanText(input.name),
    amount: normalizeAmount(input.amount),
    category: cleanText(input.category),
    kind: input.kind,
    status: "expected",
    expectedDate: input.expectedDate ?? todayValue(),
    receivedAt: null,
    notes: input.notes ?? null,
  };

  assertIncomePlanIsValid(income);

  return income;
}

export function isIncomeReceived(income: IncomePlan) {
  return income.status === "received";
}

export function isIncomeOmitted(income: IncomePlan) {
  return income.status === "omitted";
}

export function isIncomeExpected(income: IncomePlan) {
  return income.status === "expected";
}

export function isIncomeExpectedForMonth(
  income: IncomePlan,
  month: string,
) {
  return Boolean(
    income.status === "expected" &&
      income.expectedDate &&
      income.expectedDate.slice(0, 7) === month,
  );
}

export function isIncomeReceivedForMonth(
  income: IncomePlan,
  month: string,
) {
  return Boolean(
    income.status === "received" &&
      income.receivedAt &&
      income.receivedAt.slice(0, 7) === month,
  );
}

export function markIncomePlanAsReceived(
  income: IncomePlan,
  receivedAt = new Date().toISOString(),
): ReceivedIncomeResult {
  const updatedIncome: IncomePlan = {
    ...income,
    status: "received",
    receivedAt,
    updatedAt: receivedAt,
  };

  assertIncomePlanIsValid(updatedIncome);

  const movement = buildMovementFromIncomePlan(updatedIncome);

  return {
    updatedIncome,
    movement,
  };
}

export function omitIncomePlan(income: IncomePlan) {
  const updatedIncome: IncomePlan = {
    ...income,
    status: "omitted",
    updatedAt: new Date().toISOString(),
  };

  assertIncomePlanIsValid(updatedIncome);

  return updatedIncome;
}

export function restoreIncomePlan(income: IncomePlan) {
  const updatedIncome: IncomePlan = {
    ...income,
    status: "expected",
    receivedAt: null,
    updatedAt: new Date().toISOString(),
  };

  assertIncomePlanIsValid(updatedIncome);

  return updatedIncome;
}

export function getIncomeDisplayStatus(income: IncomePlan) {
  const labels: Record<IncomePlanStatus, string> = {
    expected: "Esperado",
    received: "Recibido",
    omitted: "Omitido",
  };

  return labels[income.status];
}
