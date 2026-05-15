-- Enable RLS on manager_teams table
ALTER TABLE manager_teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view manager teams" ON manager_teams;
DROP POLICY IF EXISTS "Users can insert manager teams" ON manager_teams;
DROP POLICY IF EXISTS "Users can update manager teams" ON manager_teams;
DROP POLICY IF EXISTS "Users can delete manager teams" ON manager_teams;
DROP POLICY IF EXISTS "Managers can view own team" ON manager_teams;
DROP POLICY IF EXISTS "Managers can add team members" ON manager_teams;
DROP POLICY IF EXISTS "Managers can delete own team members" ON manager_teams;

-- Create policy to allow authenticated users to view all manager teams
CREATE POLICY "Users can view manager teams" 
ON manager_teams FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow authenticated users to insert manager teams
CREATE POLICY "Users can insert manager teams" 
ON manager_teams FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create policy to allow authenticated users to update manager teams
CREATE POLICY "Users can update manager teams" 
ON manager_teams FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to delete manager teams
CREATE POLICY "Users can delete manager teams" 
ON manager_teams FOR DELETE 
TO authenticated 
USING (true);

-- Add employee_name column if it doesn't exist
ALTER TABLE manager_teams ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);

-- Add updated_at column if it doesn't exist (for trigger compatibility)
ALTER TABLE manager_teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
