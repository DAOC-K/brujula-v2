import type {
  IncomePlan,
  Movement,
  MovementType,
  PaymentPlan,
  Visibility,
} from "@/types/finance";

import { todayValue } from "./dates";
import { toMoneyNumber } from "./money";

export type MovementDraft = Omit<Movement, "id" | "createdAt" | "updatedAt">;

export type ManualMovementInput = {
  spaceId: string;
  userId: string;
  type: MovementType;
  name: string;
  amount: number;
  category: string;
  occurredOn?: string;
  isFixed?: boolean;
  visibility?: Visibility;
  notes?: string | null;
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

function assertMovementIsValid(movement: MovementDraft) {
  if (!movement.spaceId) {
    throw new Error("El movimiento necesita un espacio financiero.");
  }

  if (!movement.userId) {
    throw new Error("El movimiento necesita un usuario.");
  }

  if (!movement.name.trim()) {
    throw new Error("El movimiento necesita un nombre.");
  }

  if (movement.amount <= 0) {
    throw new Error("El movimiento debe tener un valor mayor a cero.");
  }

  if (!movement.category.trim()) {
    throw new Error("El movimiento necesita una categoría.");
  }

  if (!movement.occurredOn) {
    throw new Error("El movimiento necesita una fecha.");
  }
}

export function buildManualMovement(input: ManualMovementInput): MovementDraft {
  const movement: MovementDraft = {
    spaceId: input.spaceId,
    userId: input.userId,
    type: input.type,
    name: cleanText(input.name),
    amount: normalizeAmount(input.amount),
    category: cleanText(input.category),
    occurredOn: input.occurredOn ?? todayValue(),
    isFixed: input.isFixed ?? false,
    visibility: input.visibility ?? "private",
    sourceType: "manual",
    sourcePaymentPlanId: null,
    sourceIncomePlanId: null,
    sourceLabel: "Manual",
    notes: input.notes ?? null,
  };

  assertMovementIsValid(movement);

  return movement;
}

export function buildMovementFromPaymentPlan(
  payment: PaymentPlan,
): MovementDraft {
  const movement: MovementDraft = {
    spaceId: payment.spaceId,
    userId: payment.userId,
    type: "expense",
    name: cleanText(payment.name),
    amount: normalizeAmount(payment.amount),
    category: cleanText(payment.category),
    occurredOn: payment.paidAt?.slice(0, 10) ?? todayValue(),
    isFixed: payment.kind === "recurrent",
    visibility: "shared",
    sourceType: "payment_plan",
    sourcePaymentPlanId: payment.id,
    sourceIncomePlanId: null,
    sourceLabel: "Desde Agenda",
    notes: payment.notes,
  };

  assertMovementIsValid(movement);

  return movement;
}

export function buildMovementFromIncomePlan(income: IncomePlan): MovementDraft {
  const movement: MovementDraft = {
    spaceId: income.spaceId,
    userId: income.userId,
    type: "income",
    name: cleanText(income.name),
    amount: normalizeAmount(income.amount),
    category: cleanText(income.category),
    occurredOn: income.receivedAt?.slice(0, 10) ?? todayValue(),
    isFixed: income.kind === "recurrent",
    visibility: "shared",
    sourceType: "income_plan",
    sourcePaymentPlanId: null,
    sourceIncomePlanId: income.id,
    sourceLabel: "Desde Ingresos",
    notes: income.notes,
  };

  assertMovementIsValid(movement);

  return movement;
}

export function isLinkedMovement(movement: Movement) {
  return movement.sourceType !== "manual";
}

export function isPaymentMovement(movement: Movement) {
  return movement.sourceType === "payment_plan";
}

export function isIncomeMovement(movement: Movement) {
  return movement.sourceType === "income_plan";
}

export function getMovementDisplaySource(movement: Pick<Movement, "sourceType">) {
  if (movement.sourceType === "payment_plan") {
    return "Desde Agenda";
  }

  if (movement.sourceType === "income_plan") {
    return "Desde Ingresos";
  }

  return "Manual";
}
