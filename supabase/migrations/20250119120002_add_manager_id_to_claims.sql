-- Add manager_id column to claims table

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE claims ADD COLUMN manager_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_claims_manager_id ON claims(manager_id);

-- Update RLS policies to allow manager to view team claims
DROP POLICY IF EXISTS "Managers can view team claims" ON claims;

CREATE POLICY "Managers can view team claims" ON claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM manager_teams mt
      WHERE mt.manager_user_id = auth.uid()
      AND mt.employee_id = claims.employee_id
    )
  );

SELECT 'manager_id column added to claims table' as status;
