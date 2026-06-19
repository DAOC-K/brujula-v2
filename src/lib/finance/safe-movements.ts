import { isUniqueViolation } from "@/lib/supabase/errors";

type SupabaseClientLike = {
  from: (table: string) => any;
};

type SafeMovementInsert = {
  space_id: string;
  user_id: string;
  type: "income" | "expense";
  name: string;
  amount: number;
  category: string;
  occurred_on: string;
  is_fixed: boolean;
  visibility: "private" | "shared";
  source_type: "manual" | "payment_plan" | "income_plan";
  source_payment_plan_id: string | null;
  source_income_plan_id: string | null;
  source_label: string;
  notes: string | null;
};

export async function insertMovementIfMissing(
  supabase: SupabaseClientLike,
  movement: SafeMovementInsert,
) {
  if (movement.source_payment_plan_id) {
    const { data: existingMovement, error: existingError } = await supabase
      .from("movements")
      .select("id")
      .eq("source_payment_plan_id", movement.source_payment_plan_id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingMovement) {
      return;
    }
  }

  if (movement.source_income_plan_id) {
    const { data: existingMovement, error: existingError } = await supabase
      .from("movements")
      .select("id")
      .eq("source_income_plan_id", movement.source_income_plan_id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingMovement) {
      return;
    }
  }

  const { error } = await supabase.from("movements").insert(movement);

  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }
}
