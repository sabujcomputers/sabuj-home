-- আরকি নেটওয়ার্ক billing system
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin','employee','customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_status as enum ('active','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bill_status as enum ('unpaid','partial','paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash','mobile_banking','bank','other');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'আরকি নেটওয়ার্ক',
  tagline text not null default 'মাসিক বিল ব্যবস্থাপনা',
  monthly_bill numeric(12,2) not null default 150 check (monthly_bill >= 0),
  currency text not null default 'BDT',
  phone text,
  address text,
  logo_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  customer_code text unique not null,
  name text not null,
  phone text not null,
  address text,
  connection_no text unique,
  monthly_amount numeric(12,2) not null default 150 check (monthly_amount >= 0),
  status public.customer_status not null default 'active',
  joined_at date not null default current_date,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  unique(user_id, permission)
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  billing_month date not null,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  status public.bill_status not null default 'unpaid',
  due_amount numeric(12,2) generated always as (greatest(amount_due - amount_paid, 0)) stored,
  last_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, billing_month)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  method public.payment_method not null default 'cash',
  collected_by uuid references public.profiles(id) on delete set null,
  receipt_no text unique not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.settings(id) values (1) on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
for each row execute function public.set_updated_at();
drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();
drop trigger if exists bills_updated_at on public.bills;
create trigger bills_updated_at before update on public.bills
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists(
    select 1 from public.employee_permissions ep
    join public.profiles p on p.id = ep.user_id
    where ep.user_id = auth.uid()
      and p.role = 'employee'
      and p.is_active = true
      and ep.permission = p_permission
  );
$$;

create or replace function public.current_customer_id()
returns uuid language sql stable security definer set search_path = public
as $$
  select id from public.customers where user_id = auth.uid() limit 1;
$$;

create or replace function public.generate_customer_code()
returns text language plpgsql security definer set search_path = public
as $$
declare
  n bigint;
begin
  select coalesce(max(nullif(regexp_replace(customer_code, '\\D', '', 'g'), '')::bigint),0)+1
  into n from public.customers;
  return 'CUST-' || lpad(n::text, 5, '0');
end $$;

create or replace function public.generate_receipt_no()
returns text language plpgsql security definer set search_path = public
as $$
begin
  return 'RCP-' || to_char(now(), 'YYYYMMDDHH24MISSMS');
end $$;

create or replace function public.generate_monthly_bills(p_month date)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  if not (public.has_permission('billing.generate')) then
    raise exception 'Not authorized';
  end if;
  insert into public.bills(customer_id, billing_month, amount_due)
  select id, date_trunc('month', p_month)::date, monthly_amount
  from public.customers c
  where c.status = 'active'
  on conflict (customer_id, billing_month) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.record_payment(
  p_bill_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'cash',
  p_notes text default null
)
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare
  v_bill public.bills;
  v_payment public.payments;
  v_receipt text;
begin
  if not (public.has_permission('payments.create')) then
    raise exception 'Not authorized';
  end if;
  if p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;

  select * into v_bill from public.bills where id = p_bill_id for update;
  if not found then raise exception 'Bill not found'; end if;
  if p_amount > v_bill.due_amount then raise exception 'Payment exceeds due amount'; end if;

  v_receipt := public.generate_receipt_no();
  insert into public.payments(bill_id, customer_id, amount, method, collected_by, receipt_no, notes)
  values(v_bill.id, v_bill.customer_id, p_amount, p_method, auth.uid(), v_receipt, p_notes)
  returning * into v_payment;

  update public.bills
  set amount_paid = amount_paid + p_amount,
      status = case
        when amount_paid + p_amount >= amount_due then 'paid'::public.bill_status
        when amount_paid + p_amount > 0 then 'partial'::public.bill_status
        else 'unpaid'::public.bill_status
      end,
      last_paid_at = now()
  where id = v_bill.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values(auth.uid(), 'payment.created', 'bill', v_bill.id,
         jsonb_build_object('amount',p_amount,'receipt_no',v_receipt));
  return v_payment;
end $$;

create or replace view public.customer_balance as
select c.id, c.customer_code, c.name, c.phone, c.monthly_amount, c.status,
       coalesce(sum(b.amount_due),0) total_billed,
       coalesce(sum(b.amount_paid),0) total_paid,
       coalesce(sum(b.due_amount),0) total_due
from public.customers c
left join public.bills b on b.customer_id=c.id
group by c.id;

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.customers enable row level security;
alter table public.employee_permissions enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin() or public.has_permission('employees.view'));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (true);
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated
using (public.is_admin() or public.has_permission('customers.view') or user_id = auth.uid());
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
with check (public.is_admin() or public.has_permission('customers.create'));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
using (public.is_admin() or public.has_permission('customers.edit'))
with check (public.is_admin() or public.has_permission('customers.edit'));
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated
using (public.is_admin() or public.has_permission('customers.delete'));

drop policy if exists permissions_admin on public.employee_permissions;
create policy permissions_admin on public.employee_permissions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists bills_select on public.bills;
create policy bills_select on public.bills for select to authenticated
using (
  public.is_admin()
  or public.has_permission('billing.view')
  or customer_id = public.current_customer_id()
);
drop policy if exists bills_admin_insert on public.bills;
create policy bills_admin_insert on public.bills for insert to authenticated
with check (public.is_admin() or public.has_permission('billing.generate'));
drop policy if exists bills_admin_update on public.bills;
create policy bills_admin_update on public.bills for update to authenticated
using (public.is_admin() or public.has_permission('billing.edit'))
with check (public.is_admin() or public.has_permission('billing.edit'));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
using (
  public.is_admin()
  or public.has_permission('payments.view')
  or customer_id = public.current_customer_id()
);
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select to authenticated
using (public.is_admin() or public.has_permission('audit.view'));

-- Useful indexes
create index if not exists bills_month_idx on public.bills(billing_month);
create index if not exists bills_customer_idx on public.bills(customer_id);
create index if not exists payments_date_idx on public.payments(payment_date);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists permissions_user_idx on public.employee_permissions(user_id);

grant select on public.customer_balance to authenticated;
