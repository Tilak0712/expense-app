-- Fix manager_teams table creation (handles partial existing setup)

-- Drop existing indexes if they exist (to avoid conflicts)
DROP INDEX IF EXISTS idx_manager_teams_manager;
DROP INDEX IF EXISTS idx_manager_teams_employee;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can view own team" ON manager_teams;
DROP POLICY IF EXISTS "Managers can add team members" ON manager_teams;
DROP POLICY IF EXISTS "Managers can delete own team members" ON manager_teams;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS manager_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: one employee can only be in one manager's team
  UNIQUE(manager_user_id, employee_user_id),
  
  -- Prevent duplicate employee_id per manager
  UNIQUE(manager_user_id, employee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manager_teams_manager ON manager_teams(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_employee ON manager_teams(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_emp_id ON manager_teams(employee_id);

-- Enable RLS
ALTER TABLE manager_teams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Managers can view own team" ON manager_teams
  FOR SELECT USING (manager_user_id = auth.uid());

CREATE POLICY "Managers can add team members" ON manager_teams
  FOR INSERT WITH CHECK (manager_user_id = auth.uid());

CREATE POLICY "Managers can delete own team members" ON manager_teams
  FOR DELETE USING (manager_user_id = auth.uid());

-- Verify table created
SELECT 'manager_teams table created successfully' as status;
