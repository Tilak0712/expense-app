-- Add UPDATE policy for claims to allow managers to approve/reject
-- Managers can update claims for their team members

CREATE POLICY IF NOT EXISTS "Managers can update team claims"
ON claims
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM manager_teams mt
    WHERE mt.manager_user_id = auth.uid()
    AND mt.employee_id = claims.employee_id
  )
);

-- Allow employees to update their own claims (for drafts)
CREATE POLICY IF NOT EXISTS "Employees can update own claims"
ON claims
FOR UPDATE
USING (employee_id = auth.uid() OR employee_id IN (
  SELECT employee_id FROM profiles WHERE user_id = auth.uid()
));

SELECT 'Claim update policies added successfully' as status;
