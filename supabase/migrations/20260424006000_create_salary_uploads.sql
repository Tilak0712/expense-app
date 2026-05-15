-- Create salary_uploads table for storing salary Excel sheet uploads
CREATE TABLE IF NOT EXISTS salary_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected')),
  finance_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE salary_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can insert their own uploads
CREATE POLICY "Managers can insert salary uploads"
ON salary_uploads FOR INSERT
WITH CHECK (auth.uid()::text = manager_id::text);

-- Policy: Managers can view their own uploads
CREATE POLICY "Managers can view own salary uploads"
ON salary_uploads FOR SELECT
USING (auth.uid()::text = manager_id::text);

-- Policy: Finance users can view all uploads (assuming finance users have a specific role or metadata)
-- For now, we'll add a policy that allows users with 'finance' role in user_metadata
CREATE POLICY "Finance can view all salary uploads"
ON salary_uploads FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'finance'
  )
);

-- Policy: Finance users can update status and add notes
CREATE POLICY "Finance can update salary uploads"
ON salary_uploads FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'finance'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'finance'
  )
);

-- Create index for faster queries
CREATE INDEX idx_salary_uploads_manager_id ON salary_uploads(manager_id);
CREATE INDEX idx_salary_uploads_status ON salary_uploads(status);
CREATE INDEX idx_salary_uploads_submitted_at ON salary_uploads(submitted_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_salary_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_salary_uploads_updated_at
BEFORE UPDATE ON salary_uploads
FOR EACH ROW
EXECUTE FUNCTION update_salary_uploads_updated_at();
