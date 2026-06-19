"use client";

import { useState } from "react";

type EditableManualMovement = {
  id: string;
  name: string;
  amount: number;
  category: string;
  occurredOn: string;
  notes: string | null;
};

type EditManualMovementDialogProps = {
  action: (formData: FormData) => Promise<void>;
  movement: EditableManualMovement;
};

export function EditManualMovementDialog({
  action,
  movement,
}: EditManualMovementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-sky-300/20 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:bg-sky-300/10"
      >
        Editar
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full"
          />

          <section className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#070b1a] p-6 shadow-2xl shadow-black">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
                  Editar movimiento manual
                </p>
                <h2 className="text-2xl font-semibold">{movement.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Solo puedes editar gastos manuales. Los movimientos creados
                  desde Agenda o Ingresos mantienen trazabilidad desde su módulo
                  de origen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <form action={action} className="space-y-4">
              <input type="hidden" name="movementId" value={movement.id} />

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Nombre
                </label>
                <input
                  name="name"
                  required
                  defaultValue={movement.name}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Valor
                </label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={movement.amount}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Categoría
                </label>
                <input
                  name="category"
                  required
                  defaultValue={movement.category}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Fecha
                </label>
                <input
                  name="occurredOn"
                  type="date"
                  required
                  defaultValue={movement.occurredOn}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Notas
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={movement.notes ?? ""}
                  placeholder="Opcional"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <button className="w-full rounded-2xl bg-sky-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-200">
                Guardar cambios
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
