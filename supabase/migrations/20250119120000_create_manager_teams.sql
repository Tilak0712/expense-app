-- Create manager_teams table for team management
-- This separates team management from the profiles table

CREATE TABLE IF NOT EXISTS manager_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL, -- The display Employee ID (EMP-XXX)
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: one employee can only be in one manager's team
  UNIQUE(manager_user_id, employee_user_id),
  
  -- Prevent duplicate employee_id per manager
  UNIQUE(manager_user_id, employee_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_manager_teams_manager ON manager_teams(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_employee ON manager_teams(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_emp_id ON manager_teams(employee_id);

-- RLS Policies
ALTER TABLE manager_teams ENABLE ROW LEVEL SECURITY;

-- Managers can view their own team members
CREATE POLICY "Managers can view own team" ON manager_teams
  FOR SELECT USING (manager_user_id = auth.uid());

-- Managers can add team members
CREATE POLICY "Managers can add team members" ON manager_teams
  FOR INSERT WITH CHECK (
    manager_user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'manager'
    )
  );

-- Managers can remove their team members
CREATE POLICY "Managers can delete own team members" ON manager_teams
  FOR DELETE USING (manager_user_id = auth.uid());

-- Comment
COMMENT ON TABLE manager_teams IS 'Stores manager-team member relationships separate from profiles';
