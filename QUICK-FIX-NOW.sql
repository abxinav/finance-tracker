-- QUICK FIX: Disable RLS for Demo User
-- Run this in Supabase SQL Editor NOW

-- Disable RLS on expenses table (easiest fix for MVP)
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- Also add Google Sheets columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- Make sure demo user has a name
UPDATE public.users
SET name = 'Demo User'
WHERE id = '00000000-0000-0000-0000-000000000001';
