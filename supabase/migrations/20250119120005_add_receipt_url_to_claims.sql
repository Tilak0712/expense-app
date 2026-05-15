-- Add receipt_url column to claims table (without index due to size limits)

-- Drop any existing index on receipt_url
DROP INDEX IF EXISTS idx_claims_receipt_url;

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'receipt_url'
    ) THEN
        ALTER TABLE claims ADD COLUMN receipt_url TEXT;
    END IF;
END $$;

SELECT 'receipt_url column added to claims table (without index)' as status;
