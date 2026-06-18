import type {
  FinancialSpace,
  IncomePlan,
  Movement,
  PaymentPlan,
} from "@/types/finance";
import type {
  FinancialSpaceRow,
  IncomePlanRow,
  MovementInsert,
  MovementRow,
  PaymentPlanInsert,
  PaymentPlanRow,
} from "@/types/database";

import type { MovementDraft } from "./movements";
import type { PaymentPlanDraft } from "./payments";

export function movementDraftToInsert(draft: MovementDraft): MovementInsert {
  return {
    space_id: draft.spaceId,
    user_id: draft.userId,
    type: draft.type,
    name: draft.name,
    amount: draft.amount,
    category: draft.category,
    occurred_on: draft.occurredOn,
    is_fixed: draft.isFixed,
    visibility: draft.visibility,
    source_type: draft.sourceType,
    source_payment_plan_id: draft.sourcePaymentPlanId,
    source_income_plan_id: draft.sourceIncomePlanId,
    source_label: draft.sourceLabel,
    notes: draft.notes,
  };
}

export function paymentPlanDraftToInsert(
  draft: PaymentPlanDraft,
): PaymentPlanInsert {
  return {
    space_id: draft.spaceId,
    user_id: draft.userId,
    name: draft.name,
    amount: draft.amount,
    category: draft.category,
    kind: draft.kind,
    status: draft.status,
    due_date: draft.dueDate,
    paid_at: draft.paidAt,
    postponed_to: draft.postponedTo,
    installment_number: draft.installmentNumber,
    installment_total: draft.installmentTotal,
    total_amount: draft.totalAmount,
    remaining_amount: draft.remainingAmount,
    notes: draft.notes,
  };
}

export function movementRowToMovement(row: MovementRow): Movement {
  return {
    id: row.id,
    spaceId: row.space_id,
    userId: row.user_id,
    type: row.type,
    name: row.name,
    amount: Number(row.amount),
    category: row.category,
    occurredOn: row.occurred_on,
    isFixed: row.is_fixed,
    visibility: row.visibility,
    sourceType: row.source_type,
    sourcePaymentPlanId: row.source_payment_plan_id,
    sourceIncomePlanId: row.source_income_plan_id,
    sourceLabel: row.source_label,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function financialSpaceRowToFinancialSpace(
  row: FinancialSpaceRow,
): FinancialSpace {
  return {
    id: row.id,
    userId: row.owner_id,
    name: row.name,
    type: row.type,
    monthlyBudget: Number(row.monthly_budget),
    createdAt: row.created_at,
  };
}

export function paymentPlanRowToPaymentPlan(row: PaymentPlanRow): PaymentPlan {
  return {
    id: row.id,
    spaceId: row.space_id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    category: row.category,
    kind: row.kind,
    status: row.status,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    postponedTo: row.postponed_to,
    installmentNumber: row.installment_number,
    installmentTotal: row.installment_total,
    totalAmount: row.total_amount === null ? null : Number(row.total_amount),
    remainingAmount:
      row.remaining_amount === null ? null : Number(row.remaining_amount),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function incomePlanRowToIncomePlan(row: IncomePlanRow): IncomePlan {
  return {
    id: row.id,
    spaceId: row.space_id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    category: row.category,
    kind: row.kind,
    status: row.status,
    expectedDate: row.expected_date,
    receivedAt: row.received_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
