-- First drop dependent policies
DROP POLICY IF EXISTS "Managers can view team claims" ON claims;

-- Now drop table with cascade
DROP TABLE IF EXISTS manager_teams CASCADE;

-- Create manager_teams table (using TEXT for manager_id to match profiles.user_id)
CREATE TABLE manager_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_user_id TEXT,
    employee_name TEXT,
    employee_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(manager_id, employee_id)
);

-- Create indexes
CREATE INDEX idx_manager_teams_manager ON manager_teams(manager_id);
CREATE INDEX idx_manager_teams_employee ON manager_teams(employee_id);

-- Enable RLS
ALTER TABLE manager_teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Managers can view their own team assignments"
    ON manager_teams FOR SELECT
    USING (manager_id = auth.uid()::text);

CREATE POLICY "Managers can insert their own team assignments"
    ON manager_teams FOR INSERT
    WITH CHECK (manager_id = auth.uid()::text);

CREATE POLICY "Managers can delete their own team assignments"
    ON manager_teams FOR DELETE
    USING (manager_id = auth.uid()::text);

-- Add manager_id column to claims (as TEXT to match user_id format)
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS manager_id TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_claims_manager ON claims(manager_id);

-- Add columns for finance workflow
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS finance_notes TEXT;
