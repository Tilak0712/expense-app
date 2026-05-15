-- RLS Policies for Enterprise Salary System
-- Implements role-based access control for salary tables

-- Enable RLS on all salary tables
ALTER TABLE salary_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt()->>'user_metadata'->>'role',
    auth.jwt()->>'app_metadata'->>'role',
    'viewer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is finance manager or admin
CREATE OR REPLACE FUNCTION is_finance_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'finance_manager', 'finance_anyst');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can approve
CREATE OR REPLACE FUNCTION can_approve_salary()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'finance_manager', 'finance_anyst');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can view salary
CREATE OR REPLACE FUNCTION can_view_salary()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'finance_manager', 'finance_anyst', 'accountant', 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SALARY_RUNS Table Policies

-- Allow all authenticated users to view their own salary (if employee_id matches)
CREATE POLICY "Users can view own salary"
  ON salary_runs
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Allow finance roles to view all salary runs
CREATE POLICY "Finance can view all salaries"
  ON salary_runs
  FOR SELECT
  TO authenticated
  USING (can_view_salary());

-- Allow finance roles to insert salary runs
CREATE POLICY "Finance can insert salary runs"
  ON salary_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_finance_or_admin());

-- Allow finance roles to update salary runs
CREATE POLICY "Finance can update salary runs"
  ON salary_runs
  FOR UPDATE
  TO authenticated
  USING (is_finance_or_admin())
  WITH CHECK (is_finance_or_admin());

-- Allow finance roles to delete salary runs (only if not approved)
CREATE POLICY "Finance can delete unapproved salary runs"
  ON salary_runs
  FOR DELETE
  TO authenticated
  USING (is_finance_or_admin() AND status NOT IN ('approved', 'rejected'));

-- SALARY_COMPONENTS Table Policies

-- Allow viewing components for accessible salary runs
CREATE POLICY "Users can view components for accessible salaries"
  ON salary_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salary_runs
      WHERE salary_runs.id = salary_components.salary_run_id
      AND (
        salary_runs.employee_id = auth.uid()
        OR can_view_salary()
      )
    )
  );

-- Allow finance roles to insert components
CREATE POLICY "Finance can insert components"
  ON salary_components
  FOR INSERT
  TO authenticated
  WITH CHECK (is_finance_or_admin());

-- Allow finance roles to update components
CREATE POLICY "Finance can update components"
  ON salary_components
  FOR UPDATE
  TO authenticated
  USING (is_finance_or_admin())
  WITH CHECK (is_finance_or_admin());

-- Allow finance roles to delete components
CREATE POLICY "Finance can delete components"
  ON salary_components
  FOR DELETE
  TO authenticated
  USING (is_finance_or_admin());

-- SALARY_ALERTS Table Policies

-- Allow viewing alerts for accessible salary runs
CREATE POLICY "Users can view alerts for accessible salaries"
  ON salary_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salary_runs
      WHERE salary_runs.id = salary_alerts.salary_run_id
      AND (
        salary_runs.employee_id = auth.uid()
        OR can_view_salary()
      )
    )
  );

-- Allow system to insert alerts (via service role)
CREATE POLICY "System can insert alerts"
  ON salary_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow finance roles to update alerts (resolution)
CREATE POLICY "Finance can update alerts"
  ON salary_alerts
  FOR UPDATE
  TO authenticated
  USING (is_finance_or_admin())
  WITH CHECK (is_finance_or_admin());

-- Allow finance roles to delete alerts
CREATE POLICY "Finance can delete alerts"
  ON salary_alerts
  FOR DELETE
  TO authenticated
  USING (is_finance_or_admin());

-- SALARY_APPROVALS Table Policies

-- Allow viewing approvals for accessible salary runs
CREATE POLICY "Users can view approvals for accessible salaries"
  ON salary_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salary_runs
      WHERE salary_runs.id = salary_approvals.salary_run_id
      AND (
        salary_runs.employee_id = auth.uid()
        OR can_view_salary()
      )
    )
  );

-- Allow finance roles to insert approvals
CREATE POLICY "Finance can insert approvals"
  ON salary_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (can_approve_salary());

-- Allow viewing own approvals
CREATE POLICY "Users can view own approvals"
  ON salary_approvals
  FOR SELECT
  TO authenticated
  USING (approved_by = auth.uid());

-- SALARY_AUDIT_LOGS Table Policies

-- Allow viewing audit logs for accessible salary runs
CREATE POLICY "Users can view audit logs for accessible salaries"
  ON salary_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salary_runs
      WHERE salary_runs.id = salary_audit_logs.salary_run_id
      AND (
        salary_runs.employee_id = auth.uid()
        OR can_view_salary()
      )
    )
  );

-- Allow system to insert audit logs (via service role)
CREATE POLICY "System can insert audit logs"
  ON salary_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Audit logs are read-only for users
CREATE POLICY "Users cannot update audit logs"
  ON salary_audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Users cannot delete audit logs"
  ON salary_audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE salary_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE salary_components TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE salary_alerts TO authenticated;
GRANT SELECT, INSERT ON TABLE salary_approvals TO authenticated;
GRANT SELECT ON TABLE salary_audit_logs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_finance_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_approve_salary() TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_salary() TO authenticated;
GRANT EXECUTE ON FUNCTION compute_variance_percent(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION has_critical_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_counts(uuid) TO authenticated;
