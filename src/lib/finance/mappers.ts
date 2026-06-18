import type { Movement } from "@/types/finance";
import type { MovementInsert, MovementRow } from "@/types/database";

import type { MovementDraft } from "./movements";

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
