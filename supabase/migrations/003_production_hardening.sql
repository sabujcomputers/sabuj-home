-- Production hardening and audit coverage
create or replace function public.generate_receipt_no()
returns text language plpgsql security definer set search_path = public
as $$
declare v text;
begin
 loop
  v := 'RCP-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
  exit when not exists(select 1 from public.payments where receipt_no=v);
 end loop;
 return v;
end $$;

create or replace function public.audit_customer_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if tg_op='DELETE' then
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'customer.deleted','customer',old.id,jsonb_build_object('customer_code',old.customer_code,'name',old.name));
  return old;
 elsif tg_op='UPDATE' then
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'customer.updated','customer',new.id,jsonb_build_object('customer_code',new.customer_code,'name',new.name));
  return new;
 end if;
 return new;
end $$;
drop trigger if exists customer_audit on public.customers;
create trigger customer_audit after update or delete on public.customers for each row execute function public.audit_customer_changes();

create or replace function public.audit_bill_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case when tg_op='INSERT' then 'bill.created' else 'bill.updated' end,'bill',new.id,jsonb_build_object('billing_month',new.billing_month,'amount_due',new.amount_due,'status',new.status));
 return new;
end $$;
drop trigger if exists bill_audit on public.bills;
create trigger bill_audit after insert or update on public.bills for each row execute function public.audit_bill_changes();

revoke all on function public.generate_customer_code() from public;
revoke all on function public.generate_receipt_no() from public;
grant execute on function public.generate_customer_code() to authenticated;
grant execute on function public.generate_receipt_no() to authenticated;
