# আরকি নেটওয়ার্ক — Monthly Billing System

A Bangla-first cable/dish monthly bill collection system built with React + TypeScript + Supabase.

## Roles
- Admin: full system control.
- Employee: only explicitly granted permissions.
- Customer: only their own profile, bills and payment history.

## Core modules
Dashboard, customers, monthly bills, payments, employees/permissions, reports, settings, audit log, customer portal.

## Backend
Supabase Auth + PostgreSQL + Row Level Security + RPC functions.

## Images
Cloudinary URLs are stored in Supabase. The Cloudinary API secret must never be placed in browser code.

## Default
- Company: আরকি নেটওয়ার্ক
- Monthly bill: ৳150
- Currency: BDT

## Local setup
1. Create a Supabase project.
2. Run `supabase/migrations/001_initial.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env` and add the Supabase URL and anon key.
4. `npm install`
5. `npm run dev`

See `docs/SETUP.md` for deployment and Cloudinary/Supabase Edge Function setup.
