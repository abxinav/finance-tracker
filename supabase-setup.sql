-- SpendWise Database Schema Setup
-- Run this SQL in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    monthly_budget INTEGER DEFAULT 10000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    google_sheet_id TEXT,
    google_access_token TEXT,
    google_refresh_token TEXT
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Other')),
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    reminder_frequency TEXT DEFAULT 'never' CHECK (reminder_frequency IN ('daily', 'weekly', 'never')),
    auto_export_sheets BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

-- Create RLS policies for expenses table
-- Allow the demo user (for MVP testing without auth)
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

-- Create RLS policies for user_preferences table
CREATE POLICY "Users can view their own preferences" 
    ON public.user_preferences FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
    ON public.user_preferences FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
    ON public.user_preferences FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Insert a mock user for MVP testing (User ID: 00000000-0000-0000-0000-000000000001)
INSERT INTO public.users (id, email, name, monthly_budget)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@spendwise.com', 'Demo User', 10000)
ON CONFLICT (id) DO NOTHING;

-- Insert some sample expenses for the demo user
INSERT INTO public.expenses (id, user_id, amount, category, description, date)
VALUES 
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 80, 'Food', 'Coffee', CURRENT_DATE),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 250, 'Food', 'Lunch', CURRENT_DATE),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 150, 'Transport', 'Uber ride', CURRENT_DATE - INTERVAL '1 day'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 600, 'Entertainment', 'Movie tickets', CURRENT_DATE - INTERVAL '2 days'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 1200, 'Shopping', 'Groceries', CURRENT_DATE - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expenses table
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
