export type MovementType = "income" | "expense";

export type MovementSourceType = "manual" | "payment_plan" | "income_plan";

export type PlanKind = "recurrent" | "temporary" | "single";

export type PaymentPlanStatus =
  | "pending"
  | "overdue"
  | "paid"
  | "omitted"
  | "postponed";

export type IncomePlanStatus = "expected" | "received" | "omitted";

export type Visibility = "private" | "shared";

export type FinancialSpace = {
  id: string;
  userId: string;
  name: string;
  type: "personal" | "shared";
  monthlyBudget: number;
  createdAt: string;
};

export type Movement = {
  id: string;
  spaceId: string;
  userId: string;
  type: MovementType;
  name: string;
  amount: number;
  category: string;
  occurredOn: string;
  isFixed: boolean;
  visibility: Visibility;
  sourceType: MovementSourceType;
  sourcePaymentPlanId: string | null;
  sourceIncomePlanId: string | null;
  sourceLabel: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentPlan = {
  id: string;
  spaceId: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  kind: PlanKind;
  status: PaymentPlanStatus;
  dueDate: string | null;
  paidAt: string | null;
  postponedTo: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  totalAmount: number | null;
  remainingAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncomePlan = {
  id: string;
  spaceId: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  kind: PlanKind;
  status: IncomePlanStatus;
  expectedDate: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyContext = {
  month: string;
  spaces: FinancialSpace[];
  movements: Movement[];
  paymentPlans: PaymentPlan[];
  incomePlans: IncomePlan[];
};

export type MonthlyProjection = {
  realIncome: number;
  expectedIncome: number;
  realExpenses: number;
  pendingPayments: number;
  availableEstimated: number;
};

export type DashboardSummary = MonthlyProjection & {
  month: string;
  incomeBase: number;
  agendaImpact: number;
  movementBalance: number;
  healthScore: number;
};
