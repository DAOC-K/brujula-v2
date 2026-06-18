"use client";

import { useState } from "react";

type DeleteManualMovementButtonProps = {
  movementId: string;
  movementName: string;
  action: (formData: FormData) => Promise<void>;
};

export function DeleteManualMovementButton({
  movementId,
  movementName,
  action,
}: DeleteManualMovementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-rose-300/20 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10"
      >
        Eliminar
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#070b1a] p-5 shadow-2xl shadow-black">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-300">
              Confirmar eliminación
            </p>

            <h2 className="mt-3 text-xl font-semibold text-white">
              ¿Eliminar este movimiento?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Vas a eliminar <strong>{movementName}</strong>. Esto solo aplica
              para movimientos manuales. Los movimientos creados desde Agenda o
              Ingresos se controlan desde su módulo de origen.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Cancelar
              </button>

              <form action={action}>
                <input type="hidden" name="movementId" value={movementId} />
                <button className="w-full rounded-2xl bg-rose-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200">
                  Sí, eliminar
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
