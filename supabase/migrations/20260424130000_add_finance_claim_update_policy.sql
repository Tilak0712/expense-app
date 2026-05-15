-- Allow finance/admin profiles to update claims for verification and payment flow.
-- This prevents silent 0-row updates when finance users approve claims.

DO $$
DECLARE
  has_user_id_column BOOLEAN;
  role_check_sql TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'user_id'
  )
  INTO has_user_id_column;

  IF has_user_id_column THEN
    role_check_sql := $policy$
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
          AND lower(coalesce(p.role, '')) IN ('finance', 'finance_admin', 'finance_manager', 'admin', 'super_admin')
      )
    $policy$;
  ELSE
    role_check_sql := $policy$
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND lower(coalesce(p.role, '')) IN ('finance', 'finance_admin', 'finance_manager', 'admin', 'super_admin')
      )
    $policy$;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Finance can update claims" ON claims';
  EXECUTE format(
    'CREATE POLICY "Finance can update claims" ON claims FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
    role_check_sql,
    role_check_sql
  );
END $$;

SELECT 'Finance claim update policy created' AS status;
