import { AppShell, type AppSection } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/supabase/auth";

type PlaceholderPageProps = {
  active: AppSection;
  kicker: string;
  title: string;
  description: string;
};

export async function PlaceholderPage({
  active,
  kicker,
  title,
  description,
}: PlaceholderPageProps) {
  const { user } = await requireUser();

  return (
    <AppShell active={active} userEmail={user.email}>
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 lg:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            {kicker}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            {description}
          </p>

          <div className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm font-semibold text-emerald-100">
              Módulo preparado
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              La ruta ya está protegida, conectada al layout y lista para
              recibir la lógica financiera real.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
