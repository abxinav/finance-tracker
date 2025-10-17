-- FIX for Row Level Security - Run this in Supabase SQL Editor
-- This allows the demo user to work without authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- Create new policies that allow the demo user
CREATE POLICY "Allow demo user to view expenses" 
    ON public.expenses FOR SELECT 
    USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid OR auth.uid() = user_id);

CREATE POLICY "Allow demo user to insert expenses" 
    ON public.expenses FOR INSERT 
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid OR auth.uid() = user_id);

CREATE POLICY "Allow demo user to update expenses" 
    ON public.expenses FOR UPDATE 
    USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid OR auth.uid() = user_id);

CREATE POLICY "Allow demo user to delete expenses" 
    ON public.expenses FOR DELETE 
    USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid OR auth.uid() = user_id);
