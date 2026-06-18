export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/money";

async function signOutAction() {
  "use server";

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingSpaces, error: spacesError } = await supabase
    .from("financial_spaces")
    .select("*")
    .order("created_at", { ascending: true });

  if (spacesError) {
    throw new Error(spacesError.message);
  }

  let spaces = existingSpaces ?? [];

  if (spaces.length === 0) {
    const { data: createdSpace, error: createSpaceError } = await supabase.rpc(
      "ensure_personal_space",
    );

    if (createSpaceError) {
      throw new Error(createSpaceError.message);
    }

    spaces = [createdSpace];
  }

  const primarySpace = spaces[0];

  return (
    <main className="min-h-screen bg-[#050816] px-6 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-300">
              Brújula V2
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Inicio financiero
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Sesión activa: {user.email}
            </p>
          </div>

          <form action={signOutAction}>
            <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              Cerrar sesión
            </button>
          </form>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Espacio principal</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {primarySpace.name}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Tipo: {primarySpace.type === "personal" ? "Personal" : "Compartido"}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Presupuesto mensual</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {formatMoney(Number(primarySpace.monthly_budget))}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Base inicial para la proyección.
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm text-emerald-200">Estado</p>
            <h2 className="mt-2 text-2xl font-semibold text-emerald-100">
              Base lista
            </h2>
            <p className="mt-2 text-sm text-emerald-100/80">
              Supabase, sesión y espacio financiero funcionando.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}


