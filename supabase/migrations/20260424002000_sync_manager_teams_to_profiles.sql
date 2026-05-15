-- Add trigger to sync department and manager_name from manager_teams to profiles
-- This ensures that when a manager adds a team member with a department, it syncs to the employee's profile

-- Function to sync department and manager_name when a team member is added/updated
CREATE OR REPLACE FUNCTION sync_team_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the employee's profile with department and manager_name
  UPDATE profiles
  SET 
    department = NEW.department,
    manager_name = NEW.manager_name,
    updated_at = NOW()
  WHERE id = NEW.employee_user_id OR user_id = NEW.employee_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_manager_team_change ON manager_teams;

-- Create trigger for INSERT
CREATE TRIGGER on_manager_team_insert
AFTER INSERT ON manager_teams
FOR EACH ROW
EXECUTE FUNCTION sync_team_to_profile();

-- Create trigger for UPDATE
CREATE TRIGGER on_manager_team_update
AFTER UPDATE ON manager_teams
FOR EACH ROW
WHEN (OLD.department IS DISTINCT FROM NEW.department OR OLD.manager_name IS DISTINCT FROM NEW.manager_name)
EXECUTE FUNCTION sync_team_to_profile();

-- Also sync existing team assignments to profiles
UPDATE profiles
SET 
  department = mt.department,
  manager_name = mt.manager_name,
  updated_at = NOW()
FROM manager_teams mt
WHERE (profiles.id = mt.employee_user_id OR profiles.user_id = mt.employee_user_id)
AND (profiles.department IS NULL OR profiles.department != mt.department OR profiles.manager_name != mt.manager_name);

-- Verify
SELECT 'Team-to-profile sync trigger created successfully' as status;
