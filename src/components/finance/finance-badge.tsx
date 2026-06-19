import type {
  IncomePlanStatus,
  MovementSourceType,
  PaymentPlanStatus,
} from "@/types/finance";

type BadgeTone =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "purple";

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-white/10 bg-white/[0.04] text-slate-300",
  success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  danger: "border-rose-300/20 bg-rose-300/10 text-rose-200",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  info: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  purple: "border-violet-300/20 bg-violet-300/10 text-violet-200",
};

export function FinanceBadge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  isProjected = false,
}: {
  status: PaymentPlanStatus;
  isProjected?: boolean;
}) {
  if (isProjected) {
    return <FinanceBadge tone="info">Programado recurrente</FinanceBadge>;
  }

  const labels: Record<PaymentPlanStatus, string> = {
    pending: "Pendiente",
    overdue: "Vencido",
    paid: "Pagado",
    omitted: "Omitido",
    postponed: "Pospuesto",
  };

  const tones: Record<PaymentPlanStatus, BadgeTone> = {
    pending: "warning",
    overdue: "danger",
    paid: "success",
    omitted: "neutral",
    postponed: "info",
  };

  return <FinanceBadge tone={tones[status]}>{labels[status]}</FinanceBadge>;
}

export function IncomeStatusBadge({
  status,
  isProjected = false,
}: {
  status: IncomePlanStatus;
  isProjected?: boolean;
}) {
  if (isProjected) {
    return <FinanceBadge tone="info">Programado recurrente</FinanceBadge>;
  }

  const labels: Record<IncomePlanStatus, string> = {
    expected: "Esperado",
    received: "Recibido",
    omitted: "Omitido",
  };

  const tones: Record<IncomePlanStatus, BadgeTone> = {
    expected: "info",
    received: "success",
    omitted: "neutral",
  };

  return <FinanceBadge tone={tones[status]}>{labels[status]}</FinanceBadge>;
}

export function MovementSourceBadge({
  sourceType,
}: {
  sourceType: MovementSourceType;
}) {
  const labels: Record<MovementSourceType, string> = {
    manual: "Manual",
    payment_plan: "Desde Agenda",
    income_plan: "Desde Ingresos",
  };

  const tones: Record<MovementSourceType, BadgeTone> = {
    manual: "neutral",
    payment_plan: "warning",
    income_plan: "success",
  };

  return <FinanceBadge tone={tones[sourceType]}>{labels[sourceType]}</FinanceBadge>;
}
