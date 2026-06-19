create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'personal'
    check (type in ('personal', 'shared')),
  monthly_budget numeric(14, 2) not null default 0
    check (monthly_budget >= 0),
  currency text not null default 'COP'
    check (currency in ('COP', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.financial_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.financial_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  kind text not null check (kind in ('recurrent', 'temporary', 'single')),
  status text not null default 'pending'
    check (status in ('pending', 'overdue', 'paid', 'omitted', 'postponed')),
  due_date date,
  paid_at timestamptz,
  postponed_to date,
  installment_number integer,
  installment_total integer,
  total_amount numeric(14, 2),
  remaining_amount numeric(14, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.income_plans (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.financial_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  kind text not null check (kind in ('recurrent', 'temporary', 'single')),
  status text not null default 'expected'
    check (status in ('expected', 'received', 'omitted')),
  expected_date date,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.financial_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  occurred_on date not null,
  is_fixed boolean not null default false,
  visibility text not null default 'private'
    check (visibility in ('private', 'shared')),
  source_type text not null default 'manual'
    check (source_type in ('manual', 'payment_plan', 'income_plan')),
  source_payment_plan_id uuid references public.payment_plans(id) on delete set null,
  source_income_plan_id uuid references public.income_plans(id) on delete set null,
  source_label text not null default 'Manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movements_source_link_check check (
    (
      source_type = 'manual'
      and source_payment_plan_id is null
      and source_income_plan_id is null
    )
    or
    (
      source_type = 'payment_plan'
      and source_payment_plan_id is not null
      and source_income_plan_id is null
    )
    or
    (
      source_type = 'income_plan'
      and source_income_plan_id is not null
      and source_payment_plan_id is null
    )
  )
);

create table if not exists public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.financial_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  real_income numeric(14, 2) not null default 0,
  expected_income numeric(14, 2) not null default 0,
  real_expenses numeric(14, 2) not null default 0,
  pending_payments numeric(14, 2) not null default 0,
  available_estimated numeric(14, 2) not null default 0,
  health_score integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, user_id, month)
);

create unique index if not exists movements_source_payment_plan_unique_idx
on public.movements(source_payment_plan_id)
where source_payment_plan_id is not null;

create unique index if not exists movements_source_income_plan_unique_idx
on public.movements(source_income_plan_id)
where source_income_plan_id is not null;

create index if not exists financial_spaces_owner_id_idx
on public.financial_spaces(owner_id);

create index if not exists space_members_space_user_idx
on public.space_members(space_id, user_id);

create index if not exists movements_space_month_idx
on public.movements(space_id, occurred_on);

create index if not exists payment_plans_space_due_idx
on public.payment_plans(space_id, due_date);

create index if not exists income_plans_space_expected_idx
on public.income_plans(space_id, expected_date);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger financial_spaces_touch_updated_at
before update on public.financial_spaces
for each row execute function public.touch_updated_at();

create trigger payment_plans_touch_updated_at
before update on public.payment_plans
for each row execute function public.touch_updated_at();

create trigger income_plans_touch_updated_at
before update on public.income_plans
for each row execute function public.touch_updated_at();

create trigger movements_touch_updated_at
before update on public.movements
for each row execute function public.touch_updated_at();

create trigger monthly_snapshots_touch_updated_at
before update on public.monthly_snapshots
for each row execute function public.touch_updated_at();

create or replace function public.is_space_member(target_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.financial_spaces s
    where s.id = target_space_id
    and s.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
    and sm.user_id = auth.uid()
  );
$$;

create or replace function public.is_space_admin(target_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.financial_spaces s
    where s.id = target_space_id
    and s.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
    and sm.user_id = auth.uid()
    and sm.role in ('owner', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_space_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.space_members (space_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (space_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_financial_space_created on public.financial_spaces;

create trigger on_financial_space_created
after insert on public.financial_spaces
for each row execute function public.add_space_owner_member();

alter table public.profiles enable row level security;
alter table public.financial_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.payment_plans enable row level security;
alter table public.income_plans enable row level security;
alter table public.movements enable row level security;
alter table public.monthly_snapshots enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists financial_spaces_select_member on public.financial_spaces;
create policy financial_spaces_select_member
on public.financial_spaces
for select
using (public.is_space_member(id));

drop policy if exists financial_spaces_insert_owner on public.financial_spaces;
create policy financial_spaces_insert_owner
on public.financial_spaces
for insert
with check (owner_id = auth.uid());

drop policy if exists financial_spaces_update_admin on public.financial_spaces;
create policy financial_spaces_update_admin
on public.financial_spaces
for update
using (public.is_space_admin(id))
with check (public.is_space_admin(id));

drop policy if exists financial_spaces_delete_owner on public.financial_spaces;
create policy financial_spaces_delete_owner
on public.financial_spaces
for delete
using (owner_id = auth.uid());

drop policy if exists space_members_select_member on public.space_members;
create policy space_members_select_member
on public.space_members
for select
using (public.is_space_member(space_id));

drop policy if exists space_members_insert_admin on public.space_members;
create policy space_members_insert_admin
on public.space_members
for insert
with check (public.is_space_admin(space_id));

drop policy if exists space_members_update_admin on public.space_members;
create policy space_members_update_admin
on public.space_members
for update
using (public.is_space_admin(space_id))
with check (public.is_space_admin(space_id));

drop policy if exists space_members_delete_admin on public.space_members;
create policy space_members_delete_admin
on public.space_members
for delete
using (public.is_space_admin(space_id));

drop policy if exists payment_plans_select_member on public.payment_plans;
create policy payment_plans_select_member
on public.payment_plans
for select
using (public.is_space_member(space_id));

drop policy if exists payment_plans_insert_member on public.payment_plans;
create policy payment_plans_insert_member
on public.payment_plans
for insert
with check (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists payment_plans_update_member on public.payment_plans;
create policy payment_plans_update_member
on public.payment_plans
for update
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists payment_plans_delete_member on public.payment_plans;
create policy payment_plans_delete_member
on public.payment_plans
for delete
using (public.is_space_member(space_id));

drop policy if exists income_plans_select_member on public.income_plans;
create policy income_plans_select_member
on public.income_plans
for select
using (public.is_space_member(space_id));

drop policy if exists income_plans_insert_member on public.income_plans;
create policy income_plans_insert_member
on public.income_plans
for insert
with check (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists income_plans_update_member on public.income_plans;
create policy income_plans_update_member
on public.income_plans
for update
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists income_plans_delete_member on public.income_plans;
create policy income_plans_delete_member
on public.income_plans
for delete
using (public.is_space_member(space_id));

drop policy if exists movements_select_member_visibility on public.movements;
create policy movements_select_member_visibility
on public.movements
for select
using (
  public.is_space_member(space_id)
  and (
    visibility = 'shared'
    or user_id = auth.uid()
  )
);

drop policy if exists movements_insert_member on public.movements;
create policy movements_insert_member
on public.movements
for insert
with check (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists movements_update_owner on public.movements;
create policy movements_update_owner
on public.movements
for update
using (user_id = auth.uid() and public.is_space_member(space_id))
with check (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists movements_delete_owner on public.movements;
create policy movements_delete_owner
on public.movements
for delete
using (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists monthly_snapshots_select_member on public.monthly_snapshots;
create policy monthly_snapshots_select_member
on public.monthly_snapshots
for select
using (public.is_space_member(space_id));

drop policy if exists monthly_snapshots_insert_owner on public.monthly_snapshots;
create policy monthly_snapshots_insert_owner
on public.monthly_snapshots
for insert
with check (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists monthly_snapshots_update_owner on public.monthly_snapshots;
create policy monthly_snapshots_update_owner
on public.monthly_snapshots
for update
using (user_id = auth.uid() and public.is_space_member(space_id))
with check (user_id = auth.uid() and public.is_space_member(space_id));

drop policy if exists monthly_snapshots_delete_owner on public.monthly_snapshots;
create policy monthly_snapshots_delete_owner
on public.monthly_snapshots
for delete
using (user_id = auth.uid() and public.is_space_member(space_id));

-- Grants necesarios para usar tablas con RLS desde clientes autenticados
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.financial_spaces to authenticated;
grant select, insert, update, delete on public.space_members to authenticated;
grant select, insert, update, delete on public.payment_plans to authenticated;
grant select, insert, update, delete on public.income_plans to authenticated;
grant select, insert, update, delete on public.movements to authenticated;
grant select, insert, update, delete on public.monthly_snapshots to authenticated;

grant execute on function public.is_space_member(uuid) to authenticated;
grant execute on function public.is_space_admin(uuid) to authenticated;
grant execute on function public.touch_updated_at() to authenticated;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.add_space_owner_member() to authenticated;

-- Crea o retorna el espacio personal principal del usuario autenticado
create or replace function public.ensure_personal_space()
returns public.financial_spaces
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  result_space public.financial_spaces;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into result_space
  from public.financial_spaces
  where owner_id = current_user_id
    and type = 'personal'
  order by created_at asc
  limit 1;

  if result_space.id is not null then
    return result_space;
  end if;

  insert into public.financial_spaces (
    owner_id,
    name,
    type,
    monthly_budget,
    currency
  )
  values (
    current_user_id,
    'Personal',
    'personal',
    0,
    'COP'
  )
  returning * into result_space;

  return result_space;
end;
$$;

grant execute on function public.ensure_personal_space() to authenticated;

-- Blindaje contra duplicados financieros
create unique index if not exists movements_unique_payment_source
on public.movements(source_payment_plan_id)
where source_payment_plan_id is not null;

create unique index if not exists movements_unique_income_source
on public.movements(source_income_plan_id)
where source_income_plan_id is not null;

create unique index if not exists payment_plans_unique_recurrent_materialized_date
on public.payment_plans(space_id, name, category, amount, kind, due_date)
where kind = 'recurrent';

create unique index if not exists income_plans_unique_recurrent_materialized_date
on public.income_plans(space_id, name, category, amount, kind, expected_date)
where kind = 'recurrent';
