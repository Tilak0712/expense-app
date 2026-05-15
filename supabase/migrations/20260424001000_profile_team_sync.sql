-- Make profile updates + manager/team sync reliable across slightly different schemas.
-- Safe to run multiple times.

-- 1) PROFILES: ensure `user_id` exists and is populated (some code/policies rely on it).
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id UUID;

UPDATE profiles
SET user_id = id
WHERE user_id IS NULL;

-- RLS policies: allow a user to select/update/insert their own profile row by either `id` or `user_id`.
-- (We intentionally drop/recreate to avoid drifting policy definitions.)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id)
WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- 2) MANAGER_TEAMS: ensure columns exist for syncing employee work info.
ALTER TABLE manager_teams
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS manager_name TEXT;

ALTER TABLE manager_teams ENABLE ROW LEVEL SECURITY;

-- Allow employees to read their own assignment (works whether employee_user_id is UUID or TEXT).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manager_teams' AND column_name = 'employee_user_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Employees can view own team assignment" ON manager_teams;';
    EXECUTE $pol$
      CREATE POLICY "Employees can view own team assignment"
      ON manager_teams
      FOR SELECT
      TO authenticated
      USING (employee_user_id::text = auth.uid()::text);
    $pol$;
  END IF;
END $$;

-- Ensure managers can read/insert/delete their rows for both possible schemas.
DO $$
BEGIN
  -- Newer schema: manager_user_id UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manager_teams' AND column_name = 'manager_user_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Managers can view own team" ON manager_teams;';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can add team members" ON manager_teams;';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can delete own team members" ON manager_teams;';
    EXECUTE $pol$
      CREATE POLICY "Managers can view own team"
      ON manager_teams
      FOR SELECT
      TO authenticated
      USING (manager_user_id = auth.uid());
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "Managers can add team members"
      ON manager_teams
      FOR INSERT
      TO authenticated
      WITH CHECK (manager_user_id = auth.uid());
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "Managers can delete own team members"
      ON manager_teams
      FOR DELETE
      TO authenticated
      USING (manager_user_id = auth.uid());
    $pol$;
  END IF;

  -- Older schema: manager_id TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manager_teams' AND column_name = 'manager_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Managers can view their own team assignments" ON manager_teams;';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can insert their own team assignments" ON manager_teams;';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can delete their own team assignments" ON manager_teams;';
    EXECUTE $pol$
      CREATE POLICY "Managers can view their own team assignments"
      ON manager_teams
      FOR SELECT
      TO authenticated
      USING (manager_id = auth.uid()::text);
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "Managers can insert their own team assignments"
      ON manager_teams
      FOR INSERT
      TO authenticated
      WITH CHECK (manager_id = auth.uid()::text);
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "Managers can delete their own team assignments"
      ON manager_teams
      FOR DELETE
      TO authenticated
      USING (manager_id = auth.uid()::text);
    $pol$;
  END IF;
END $$;

