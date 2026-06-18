"use client";

import { useState } from "react";

import { todayValue } from "@/lib/finance/dates";

type IncomePlanDialogProps = {
  action: (formData: FormData) => Promise<void>;
  defaultExpectedDate?: string;
};

export function IncomePlanDialog({
  action,
  defaultExpectedDate,
}: IncomePlanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        + Crear ingreso
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
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                  Ingresos esperados
                </p>
                <h2 className="text-2xl font-semibold">Crear ingreso</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Programa salarios, ingresos recurrentes, entradas temporales o
                  ingresos únicos. Al marcarlo recibido, Brújula creará el
                  movimiento real.
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
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Tipo de ingreso
                </label>
                <select
                  name="kind"
                  defaultValue="single"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  <option value="single">Único</option>
                  <option value="recurrent">Recurrente</option>
                  <option value="temporary">Temporal</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Nombre
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ej: Salario, venta, freelance"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
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
                  placeholder="2500000"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Categoría
                </label>
                <input
                  name="category"
                  required
                  placeholder="Ej: Salario, ventas, extra"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Fecha esperada
                </label>
                <input
                  name="expectedDate"
                  type="date"
                  defaultValue={defaultExpectedDate ?? todayValue()}
                  required
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
                  placeholder="Opcional"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <button className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300">
                Guardar ingreso esperado
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
