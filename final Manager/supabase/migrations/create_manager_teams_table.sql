-- Create manager_teams table to track manager-employee relationships
CREATE TABLE IF NOT EXISTS public.manager_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manager_teams_manager_user_id ON public.manager_teams(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_employee_user_id ON public.manager_teams(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_employee_id ON public.manager_teams(employee_id);

-- Enable RLS
ALTER TABLE public.manager_teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can view their team" ON public.manager_teams;
DROP POLICY IF EXISTS "Managers can add team members" ON public.manager_teams;
DROP POLICY IF EXISTS "Managers can remove team members" ON public.manager_teams;
DROP POLICY IF EXISTS "Managers can update team members" ON public.manager_teams;

-- RLS Policies (more permissive for testing)
-- Authenticated users can view team members
CREATE POLICY "Managers can view their team"
  ON public.manager_teams FOR SELECT
  USING (auth.uid() = manager_user_id);

-- Authenticated users can add team members
CREATE POLICY "Managers can add team members"
  ON public.manager_teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can remove team members
CREATE POLICY "Managers can remove team members"
  ON public.manager_teams FOR DELETE
  USING (auth.uid() = manager_user_id);

-- Authenticated users can update team member details
CREATE POLICY "Managers can update team members"
  ON public.manager_teams FOR UPDATE
  USING (auth.uid() = manager_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_manager_teams_updated_at ON public.manager_teams;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_manager_teams_updated_at
  BEFORE UPDATE ON public.manager_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
