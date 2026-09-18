# Setup Guide

## 1. Supabase
Create a Supabase project, open SQL Editor and run:
`supabase/migrations/001_initial.sql`

Then open Authentication > Providers and enable Email/Password.

Set the first admin account manually:
1. Create an auth user in Supabase Authentication.
2. Copy that user's UUID.
3. Run:
```sql
update public.profiles
set role = 'admin', full_name = 'System Admin', is_active = true
where id = 'AUTH_USER_UUID';
```

## 2. Environment
Create `.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=আরকি নেটওয়ার্ক
```

Never put a Supabase service-role key in VITE_* variables.

## 3. Cloudinary
Create an upload preset. For production, use a signed upload flow through a Supabase Edge Function. Do not expose CLOUDINARY_API_SECRET in the frontend.

## 4. First login
Use the admin email/password created in Supabase Auth.

## 5. Billing
Run the "Generate bills" action for a month from the admin dashboard. Each active customer's current monthly_amount is copied into that month's bill, so changing the amount later does not alter old bills.

## 6. Security
RLS is enabled on all business tables. Customer queries are limited to their own customer record. Employee actions require matching permissions. Admin is unrestricted within the application tables.
