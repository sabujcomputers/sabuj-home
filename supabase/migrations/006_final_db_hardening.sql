-- Final database hardening: pin SECURITY DEFINER search paths and add FK indexes.

alter function public.set_updated_at() set search_path = '';

alter function public.handle_new_user() set search_path = '';
alter function public.is_admin() set search_path = '';
alter function public.has_permission(text) set search_path = '';
alter function public.current_customer_id() set search_path = '';
alter function public.generate_customer_code() set search_path = '';
alter function public.generate_receipt_no() set search_path = '';
alter function public.generate_monthly_bills(date) set search_path = '';
alter function public.record_payment(uuid,numeric,public.payment_method,text) set search_path = '';
alter function public.audit_customer_changes() set search_path = '';
alter function public.audit_bill_changes() set search_path = '';

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists payments_bill_idx on public.payments(bill_id);
create index if not exists payments_customer_idx on public.payments(customer_id);
create index if not exists payments_collected_by_idx on public.payments(collected_by);
