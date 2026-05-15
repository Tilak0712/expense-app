-- Enable RLS on claims table
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all claims" ON claims;
DROP POLICY IF EXISTS "Users can insert their own claims" ON claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON claims;
DROP POLICY IF EXISTS "Users can delete their own claims" ON claims;

-- Create policy to allow authenticated users to view all claims (for finance users)
CREATE POLICY "Users can view all claims" 
ON claims FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow users to insert their own claims
CREATE POLICY "Users can insert their own claims" 
ON claims FOR INSERT 
TO authenticated 
WITH CHECK (employee_id = auth.uid());

-- Create policy to allow users to update their own claims
CREATE POLICY "Users can update their own claims" 
ON claims FOR UPDATE 
TO authenticated 
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Create policy to allow users to delete their own claims
CREATE POLICY "Users can delete their own claims" 
ON claims FOR DELETE 
TO authenticated 
USING (employee_id = auth.uid());
