-- Enterprise Upgrades: Audit Logs and Claim Enhancements

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- e.g., 'claim', 'receipt', 'profile'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- e.g., 'SUBMIT', 'APPROVE', 'REJECT', 'MODIFY', 'REQUEST_CLARIFICATION'
    user_id UUID REFERENCES auth.users(id),
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast audit history lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins/Finance can see all, managers can see team, employees can see their own
CREATE POLICY "Users can view audit logs for their own claims" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE claims.id = audit_logs.entity_id 
      AND claims.employee_id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true); -- Usually restricted to authenticated users or service roles

-- 2. Enhance claims table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'policy_flags'
  ) THEN
    ALTER TABLE claims ADD COLUMN policy_flags JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'clarification_notes'
  ) THEN
    ALTER TABLE claims ADD COLUMN clarification_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'claims' AND column_name = 'approval_tier'
  ) THEN
    ALTER TABLE claims ADD COLUMN approval_tier INTEGER DEFAULT 1;
  END IF;
END $$;

-- 3. Enhance status constraints if possible, but for now we rely on app-level logic to add new states like 'needs_clarification' or 'partial_approval'.

SELECT 'Enterprise upgrades migration complete' as status;
