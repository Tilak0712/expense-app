-- Enterprise Salary Approval System
-- SAP Fiori-inspired Finance Portal Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Salary Runs Table (Main salary records per pay period)
CREATE TABLE IF NOT EXISTS salary_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  cost_center TEXT,
  department TEXT,
  pay_period TEXT NOT NULL, -- Format: YYYY-MM (e.g., 2025-01)
  pay_date DATE,
  
  -- Salary amounts
  gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Variance tracking (computed during salary generation)
  variance_percent DECIMAL(5, 2),
  previous_month_salary DECIMAL(12, 2),
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'manager_review', 'hr_review', 'finance_review', 'approved', 'rejected', 'on_hold', 'correction_required')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  -- Constraints
  CONSTRAINT unique_employee_period UNIQUE (employee_id, pay_period)
);

-- Create indexes for performance
CREATE INDEX idx_salary_runs_employee_id ON salary_runs(employee_id);
CREATE INDEX idx_salary_runs_status ON salary_runs(status);
CREATE INDEX idx_salary_runs_variance ON salary_runs(variance_percent DESC);
CREATE INDEX idx_salary_runs_pay_period ON salary_runs(pay_period);
CREATE INDEX idx_salary_runs_department ON salary_runs(department);
CREATE INDEX idx_salary_runs_cost_center ON salary_runs(cost_center);

-- Salary Components Table (Earnings and Deductions)
CREATE TABLE IF NOT EXISTS salary_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_run_id UUID NOT NULL REFERENCES salary_runs(id) ON DELETE CASCADE,
  
  -- Component type
  component_type TEXT NOT NULL CHECK (component_type IN ('earning', 'deduction', 'reimbursement')),
  component_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Additional details
  description TEXT,
  is_taxable BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_salary_components_salary_run_id ON salary_components(salary_run_id);
CREATE INDEX idx_salary_components_type ON salary_components(component_type);

-- Salary Alerts Table (Compliance Engine)
CREATE TABLE IF NOT EXISTS salary_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_run_id UUID NOT NULL REFERENCES salary_runs(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'missing_pf',
    'missing_tds',
    'high_bonus',
    'duplicate_reimbursement',
    'salary_out_of_band',
    'negative_net',
    'missing_bank_account',
    'incomplete_docs'
  )),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  
  -- Alert details
  alert_message TEXT,
  field_name TEXT,
  expected_value DECIMAL(12, 2),
  actual_value DECIMAL(12, 2),
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes
CREATE INDEX idx_salary_alerts_salary_run_id ON salary_alerts(salary_run_id);
CREATE INDEX idx_salary_alerts_severity ON salary_alerts(severity);
CREATE INDEX idx_salary_alerts_type ON salary_alerts(alert_type);
CREATE INDEX idx_salary_alerts_resolved ON salary_alerts(is_resolved);

-- Salary Approvals Table (Multi-level Approval Workflow)
CREATE TABLE IF NOT EXISTS salary_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_run_id UUID NOT NULL REFERENCES salary_runs(id) ON DELETE CASCADE,
  
  -- Approval details
  role TEXT NOT NULL CHECK (role IN ('manager', 'hr', 'finance')),
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'sent_back', 'on_hold')),
  
  -- Approver information
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approver_name TEXT,
  
  -- Comments
  comment TEXT,
  
  -- Approval level tracking
  approval_level INTEGER NOT NULL, -- 1 = Manager, 2 = HR, 3 = Finance
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_salary_approvals_salary_run_id ON salary_approvals(salary_run_id);
CREATE INDEX idx_salary_approvals_role ON salary_approvals(role);
CREATE INDEX idx_salary_approvals_action ON salary_approvals(action);
CREATE INDEX idx_salary_approvals_approved_by ON salary_approvals(approved_by);

-- Unique constraint: One approval per role per salary run
CREATE UNIQUE INDEX unique_approval_per_role ON salary_approvals(salary_run_id, role);

-- Salary Audit Logs Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS salary_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_run_id UUID NOT NULL REFERENCES salary_runs(id) ON DELETE CASCADE,
  
  -- Change details
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  value_type TEXT CHECK (value_type IN ('text', 'number', 'boolean', 'date')),
  
  -- Who made the change
  changed_by TEXT NOT NULL,
  changed_by_name TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Change context
  change_reason TEXT,
  change_source TEXT, -- 'manual', 'system', 'import', 'approval'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_salary_audit_logs_salary_run_id ON salary_audit_logs(salary_run_id);
CREATE INDEX idx_salary_audit_logs_changed_by ON salary_audit_logs(changed_by);
CREATE INDEX idx_salary_audit_logs_field_name ON salary_audit_logs(field_name);
CREATE INDEX idx_salary_audit_logs_changed_at ON salary_audit_logs(changed_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_salary_runs_updated_at BEFORE UPDATE ON salary_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_components_updated_at BEFORE UPDATE ON salary_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to compute variance percent (to be used during salary generation)
CREATE OR REPLACE FUNCTION compute_variance_percent(
  current_salary DECIMAL,
  previous_salary DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  IF previous_salary IS NULL OR previous_salary = 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND(((current_salary - previous_salary) / previous_salary) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to check if salary run has critical alerts
CREATE OR REPLACE FUNCTION has_critical_alerts(salary_run_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM salary_alerts
    WHERE salary_run_id = salary_run_uuid
    AND severity = 'critical'
    AND is_resolved = false
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get alert count by severity
CREATE OR REPLACE FUNCTION get_alert_counts(salary_run_uuid UUID)
RETURNS TABLE(warning_count INTEGER, critical_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE severity = 'warning' AND is_resolved = false),
    COUNT(*) FILTER (WHERE severity = 'critical' AND is_resolved = false)
  FROM salary_alerts
  WHERE salary_run_id = salary_run_uuid;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE salary_runs IS 'Main salary records per employee per pay period';
COMMENT ON TABLE salary_components IS 'Individual salary components (earnings, deductions, reimbursements)';
COMMENT ON TABLE salary_alerts IS 'Compliance alerts generated by the system';
COMMENT ON TABLE salary_approvals IS 'Multi-level approval workflow tracking';
COMMENT ON TABLE salary_audit_logs IS 'Immutable audit trail for all changes';
