import Link from "next/link";

import { currentMonthValue, getMonthLabel, shiftMonth } from "@/lib/finance/dates";

type MonthSelectorProps = {
  month: string;
  basePath: string;
};

export function MonthSelector({ month, basePath }: MonthSelectorProps) {
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const currentMonth = currentMonthValue();

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
        Periodo
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold capitalize">
          {getMonthLabel(month)}
        </h2>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`${basePath}?month=${previousMonth}`}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            ← Anterior
          </Link>

          <Link
            href={`${basePath}?month=${currentMonth}`}
            className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Este mes
          </Link>

          <Link
            href={`${basePath}?month=${nextMonth}`}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Siguiente →
          </Link>
        </div>
      </div>
    </div>
  );
}
