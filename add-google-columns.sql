-- Add Google Sheets columns if they don't exist
-- Run this if you already have the users table created

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- Update the demo user if it exists
UPDATE public.users
SET name = 'Demo User'
WHERE id = '00000000-0000-0000-0000-000000000001' AND name IS NULL;
