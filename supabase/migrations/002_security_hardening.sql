-- Security hardening
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists permissions_select_own on public.employee_permissions;
create policy permissions_select_own on public.employee_permissions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop view if exists public.customer_balance;

-- Only trusted RPCs should create payments.
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;
