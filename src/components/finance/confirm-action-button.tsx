"use client";

import { useState } from "react";

type HiddenField = {
  name: string;
  value: string;
};

type ConfirmActionButtonProps = {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: HiddenField[];
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "success";
};

export function ConfirmActionButton({
  action,
  hiddenFields,
  triggerLabel,
  title,
  description,
  confirmLabel,
  tone = "danger",
}: ConfirmActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const triggerClass =
    tone === "danger"
      ? "border-rose-300/20 text-rose-200 hover:bg-rose-300/10"
      : "border-emerald-300/20 text-emerald-200 hover:bg-emerald-300/10";

  const confirmClass =
    tone === "danger"
      ? "bg-rose-300 hover:bg-rose-200"
      : "bg-emerald-300 hover:bg-emerald-200";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${triggerClass}`}
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#070b1a] p-5 shadow-2xl shadow-black">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-300">
              Confirmar acción
            </p>

            <h2 className="mt-3 text-xl font-semibold text-white">
              {title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {description}
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
                {hiddenFields.map((field) => (
                  <input
                    key={field.name}
                    type="hidden"
                    name={field.name}
                    value={field.value}
                  />
                ))}

                <button
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-slate-950 transition ${confirmClass}`}
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
