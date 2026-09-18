create or replace function public.generate_receipt_no()
returns text language plpgsql security definer set search_path=public
as $$
declare v text;
begin
 loop
  v := 'RCP-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || upper(substr(md5(clock_timestamp()::text || random()::text),1,6));
  exit when not exists(select 1 from public.payments where receipt_no=v);
 end loop;
 return v;
end $$;
