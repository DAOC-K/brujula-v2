import { AppShell } from "@/components/layout/app-shell";
import { getMovementDisplaySource } from "@/lib/finance/movements";
import { movementRowToMovement } from "@/lib/finance/mappers";
import { formatMoney, sumMoney } from "@/lib/finance/money";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function MovementsPage() {
  const { supabase, user } = await requireUser();

  const { data: space, error: spaceError } = await supabase.rpc(
    "ensure_personal_space",
  );

  if (spaceError) {
    throw new Error(spaceError.message);
  }

  if (!space) {
    throw new Error("No se encontró un espacio financiero.");
  }

  const { data: movementRows, error: movementsError } = await supabase
    .from("movements")
    .select("*")
    .eq("space_id", space.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (movementsError) {
    throw new Error(movementsError.message);
  }

  const movements = (movementRows ?? []).map(movementRowToMovement);

  const realIncome = sumMoney(
    movements.filter((movement) => movement.type === "income"),
    (movement) => movement.amount,
  );

  const realExpenses = sumMoney(
    movements.filter((movement) => movement.type === "expense"),
    (movement) => movement.amount,
  );

  const balance = realIncome - realExpenses;

  return (
    <AppShell active="movements" userEmail={user.email}>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
              Libro real
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Movimientos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Aquí se ve la realidad de tu dinero: ingresos recibidos, gastos
              reales, pagos confirmados desde Agenda y entradas confirmadas
              desde Ingresos esperados.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-400"
          >
            + Registrar manual
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm text-emerald-200">Ingresos reales</p>
            <h2 className="mt-3 text-2xl font-semibold text-emerald-100">
              {formatMoney(realIncome)}
            </h2>
          </article>

          <article className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-5">
            <p className="text-sm text-rose-200">Gastos reales</p>
            <h2 className="mt-3 text-2xl font-semibold text-rose-100">
              {formatMoney(realExpenses)}
            </h2>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Balance real</p>
            <h2
              className={`mt-3 text-2xl font-semibold ${
                balance >= 0 ? "text-emerald-200" : "text-rose-200"
              }`}
            >
              {formatMoney(balance)}
            </h2>
          </article>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Historial</p>
              <h2 className="text-2xl font-semibold">Movimientos reales</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              {movements.length} registros
            </span>
          </div>

          {movements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-lg font-semibold">
                Todavía no hay movimientos reales
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Cuando confirmes pagos desde Agenda, ingresos desde Ingresos
                esperados o registres movimientos manuales reales, aparecerán
                aquí como tu historial financiero.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => {
                const isIncome = movement.type === "income";

                return (
                  <article
                    key={movement.id}
                    className="rounded-3xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{movement.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {movement.category} · {movement.occurredOn} ·{" "}
                          {getMovementDisplaySource(movement)}
                        </p>
                        {movement.notes ? (
                          <p className="mt-2 text-sm text-slate-500">
                            {movement.notes}
                          </p>
                        ) : null}
                      </div>

                      <p
                        className={`text-right text-lg font-bold ${
                          isIncome ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatMoney(movement.amount)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
