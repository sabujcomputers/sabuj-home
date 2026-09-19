-- Lock down SECURITY DEFINER functions exposed through the Data API.
-- Keep only the RPCs and helper functions that the signed-in application needs.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.audit_bill_changes() from public, anon, authenticated;
revoke execute on function public.audit_customer_changes() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_receipt_no() from public, anon, authenticated;

revoke execute on function public.generate_customer_code() from public, anon, authenticated;
grant execute on function public.generate_customer_code() to service_role;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

revoke execute on function public.current_customer_id() from public, anon;
grant execute on function public.current_customer_id() to authenticated;

revoke execute on function public.generate_monthly_bills(date) from public, anon;
grant execute on function public.generate_monthly_bills(date) to authenticated;

revoke execute on function public.record_payment(uuid,numeric,public.payment_method,text) from public, anon;
grant execute on function public.record_payment(uuid,numeric,public.payment_method,text) to authenticated;
