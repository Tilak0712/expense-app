DROP POLICY IF EXISTS "Managers can view team claims" ON claims;

CREATE POLICY "Managers can view team claims"
ON claims FOR SELECT USING (
  manager_id::text = auth.uid()::text
  OR claims.employee_id::text IN (
    SELECT mt.employee_id::text FROM manager_teams mt WHERE mt.manager_user_id::text = auth.uid()::text
  )
  OR claims.employee_id::text IN (
    SELECT mt.employee_user_id::text FROM manager_teams mt WHERE mt.manager_user_id::text = auth.uid()::text AND mt.employee_user_id IS NOT NULL
  )
  OR claims.employee_id::text IN (
    SELECT p.id::text FROM profiles p 
    INNER JOIN manager_teams mt ON mt.employee_id::text = p.employee_id::text 
    WHERE mt.manager_user_id::text = auth.uid()::text
  )
);

-- Fix UPDATE policy with the same matching logic so managers can approve/reject
DROP POLICY IF EXISTS "Managers can update team claims" ON claims;

CREATE POLICY "Managers can update team claims"
ON claims FOR UPDATE USING (
  manager_id::text = auth.uid()::text
  OR claims.employee_id::text IN (
    SELECT mt.employee_id::text FROM manager_teams mt WHERE mt.manager_user_id::text = auth.uid()::text
  )
  OR claims.employee_id::text IN (
    SELECT mt.employee_user_id::text FROM manager_teams mt WHERE mt.manager_user_id::text = auth.uid()::text AND mt.employee_user_id IS NOT NULL
  )
  OR claims.employee_id::text IN (
    SELECT p.id::text FROM profiles p 
    INNER JOIN manager_teams mt ON mt.employee_id::text = p.employee_id::text 
    WHERE mt.manager_user_id::text = auth.uid()::text
  )
);