export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialSpaceRow = {
  id: string;
  owner_id: string;
  name: string;
  type: "personal" | "shared";
  monthly_budget: number;
  currency: "COP" | "USD";
  created_at: string;
  updated_at: string;
};

export type SpaceMemberRow = {
  id: string;
  space_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
};

export type MovementRow = {
  id: string;
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
  created_at: string;
  updated_at: string;
};

export type PaymentPlanRow = {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  kind: "recurrent" | "temporary" | "single";
  status: "pending" | "overdue" | "paid" | "omitted" | "postponed";
  due_date: string | null;
  paid_at: string | null;
  postponed_to: string | null;
  installment_number: number | null;
  installment_total: number | null;
  total_amount: number | null;
  remaining_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type IncomePlanRow = {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  kind: "recurrent" | "temporary" | "single";
  status: "expected" | "received" | "omitted";
  expected_date: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthlySnapshotRow = {
  id: string;
  space_id: string;
  user_id: string;
  month: string;
  real_income: number;
  expected_income: number;
  real_expenses: number;
  pending_payments: number;
  available_estimated: number;
  health_score: number;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at">;

export type ProfileUpdate = Partial<
  Omit<ProfileRow, "id" | "created_at" | "updated_at">
>;

export type FinancialSpaceInsert = Omit<
  FinancialSpaceRow,
  "id" | "created_at" | "updated_at"
>;

export type FinancialSpaceUpdate = Partial<FinancialSpaceInsert>;

export type SpaceMemberInsert = Omit<SpaceMemberRow, "id" | "created_at">;

export type SpaceMemberUpdate = Partial<
  Omit<SpaceMemberRow, "id" | "created_at">
>;

export type MovementInsert = Omit<
  MovementRow,
  "id" | "created_at" | "updated_at"
>;

export type MovementUpdate = Partial<MovementInsert>;

export type PaymentPlanInsert = Omit<
  PaymentPlanRow,
  "id" | "created_at" | "updated_at"
>;

export type PaymentPlanUpdate = Partial<PaymentPlanInsert>;

export type IncomePlanInsert = Omit<
  IncomePlanRow,
  "id" | "created_at" | "updated_at"
>;

export type IncomePlanUpdate = Partial<IncomePlanInsert>;

export type MonthlySnapshotInsert = Omit<
  MonthlySnapshotRow,
  "id" | "created_at" | "updated_at"
>;

export type MonthlySnapshotUpdate = Partial<MonthlySnapshotInsert>;

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, ProfileInsert, ProfileUpdate>;
      financial_spaces: TableDefinition<
        FinancialSpaceRow,
        FinancialSpaceInsert,
        FinancialSpaceUpdate
      >;
      space_members: TableDefinition<
        SpaceMemberRow,
        SpaceMemberInsert,
        SpaceMemberUpdate
      >;
      movements: TableDefinition<MovementRow, MovementInsert, MovementUpdate>;
      payment_plans: TableDefinition<
        PaymentPlanRow,
        PaymentPlanInsert,
        PaymentPlanUpdate
      >;
      income_plans: TableDefinition<
        IncomePlanRow,
        IncomePlanInsert,
        IncomePlanUpdate
      >;
      monthly_snapshots: TableDefinition<
        MonthlySnapshotRow,
        MonthlySnapshotInsert,
        MonthlySnapshotUpdate
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
