export type Role='admin'|'employee'|'customer';
export type Permission=
  |'customers.view'|'customers.create'|'customers.edit'|'customers.delete'
  |'billing.view'|'billing.generate'|'billing.edit'
  |'payments.view'|'payments.create'
  |'employees.view'|'employees.manage'|'audit.view';

export interface Profile{ id:string; full_name:string; phone:string|null; role:Role; is_active:boolean; avatar_url:string|null; }
export interface Customer{ id:string; user_id:string|null; customer_code:string; name:string; phone:string; address:string|null; connection_no:string|null; monthly_amount:number; status:'active'|'inactive'; joined_at:string; photo_url:string|null; notes:string|null; }
export interface Bill{ id:string; customer_id:string; billing_month:string; amount_due:number; amount_paid:number; status:'unpaid'|'partial'|'paid'; due_amount:number; last_paid_at:string|null; customer?:Pick<Customer,'name'|'customer_code'|'phone'>; }
export interface Payment{ id:string; bill_id:string; customer_id:string; amount:number; payment_date:string; method:'cash'|'mobile_banking'|'bank'|'other'; receipt_no:string; collected_by:string|null; notes:string|null; }
export interface Settings{ id:number; company_name:string; tagline:string; monthly_bill:number; currency:string; phone:string|null; address:string|null; logo_url:string|null; }
