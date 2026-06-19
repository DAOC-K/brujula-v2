import { revalidatePath } from "next/cache";

import { DeleteManualMovementButton } from "@/components/finance/delete-manual-movement-button";
import { EditManualMovementDialog } from "@/components/finance/edit-manual-movement-dialog";
import { ManualMovementDialog } from "@/components/finance/manual-movement-dialog";
import { MonthSelector } from "@/components/finance/month-selector";
import { AppShell } from "@/components/layout/app-shell";
import { currentMonthValue, shiftMonth, todayValue } from "@/lib/finance/dates";
import {
  movementDraftToInsert,
  movementRowToMovement,
} from "@/lib/finance/mappers";
import { formatMoney, sumMoney } from "@/lib/finance/money";
import {
  buildManualMovement,
  getMovementDisplaySource,
} from "@/lib/finance/movements";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

type MovementsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

function resolveMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return currentMonthValue();
  }

  return month;
}

async function createManualMovementAction(formData: FormData) {
  "use server";

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

  const notesValue = String(formData.get("notes") ?? "").trim();

  const movementDraft = buildManualMovement({
    spaceId: space.id,
    userId: user.id,
    type: "expense",
    name: String(formData.get("name") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    category: String(formData.get("category") ?? ""),
    occurredOn: String(formData.get("occurredOn") ?? todayValue()),
    isFixed: false,
    visibility: "private",
    notes: notesValue ? notesValue : null,
  });

  const { error } = await supabase
    .from("movements")
    .insert(movementDraftToInsert(movementDraft));

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

async function updateManualMovementAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();
  const movementId = String(formData.get("movementId") ?? "");

  if (!movementId) {
    throw new Error("No se recibió el movimiento a editar.");
  }

  const notesValue = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase
    .from("movements")
    .update({
      name: String(formData.get("name") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
      category: String(formData.get("category") ?? ""),
      occurred_on: String(formData.get("occurredOn") ?? todayValue()),
      notes: notesValue ? notesValue : null,
    })
    .eq("id", movementId)
    .eq("user_id", user.id)
    .eq("source_type", "manual")
    .eq("type", "expense");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/movements");
  revalidatePath("/dashboard");
}
async function deleteManualMovementAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireUser();
  const movementId = String(formData.get("movementId") ?? "");

  if (!movementId) {
    throw new Error("No se recibió el movimiento a eliminar.");
  }

  const { error } = await supabase
    .from("movements")
    .delete()
    .eq("id", movementId)
    .eq("user_id", user.id)
    .eq("source_type", "manual");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

export default async function MovementsPage({
  searchParams,
}: MovementsPageProps) {
  const params = await searchParams;
  const month = resolveMonth(params?.month);
  const nextMonth = shiftMonth(month, 1);

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
    .gte("occurred_on", `${month}-01`)
    .lt("occurred_on", `${nextMonth}-01`)
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
              Aquí se ve la realidad de tu dinero por periodo: ingresos
              recibidos, gastos reales, pagos confirmados desde Agenda y
              entradas confirmadas desde Ingresos esperados.
            </p>
          </div>

          <ManualMovementDialog action={createManualMovementAction} />
        </div>

        <div className="mb-6">
          <MonthSelector month={month} basePath="/movements" />
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
              <p className="text-sm text-slate-400">Historial del periodo</p>
              <h2 className="text-2xl font-semibold">Movimientos reales</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              {movements.length} registros
            </span>
          </div>

          {movements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-lg font-semibold">
                No hay movimientos en este periodo
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Cambia de mes o registra un gasto manual real si corresponde a
                este periodo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => {
                const isIncome = movement.type === "income";
                const canEdit = movement.sourceType === "manual";
                const canDelete = movement.sourceType === "manual";

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

                        {canEdit || canDelete ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {canEdit ? (
                              <EditManualMovementDialog
                                action={updateManualMovementAction}
                                movement={{
                                  id: movement.id,
                                  name: movement.name,
                                  amount: movement.amount,
                                  category: movement.category,
                                  occurredOn: movement.occurredOn,
                                  notes: movement.notes,
                                }}
                              />
                            ) : null}

                            {canDelete ? (
                              <DeleteManualMovementButton
                                movementId={movement.id}
                                movementName={movement.name}
                                action={deleteManualMovementAction}
                              />
                            ) : null}
                          </div>
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

