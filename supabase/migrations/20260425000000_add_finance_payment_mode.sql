-- Add finance_payment_mode column to claims table
-- This stores the actual payment method used by finance (NEFT, IMPS, RTGS, UPI)
-- separate from the employee's requested payment mode

DO $$
BEGIN
  -- Check if column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'claims' 
    AND column_name = 'finance_payment_mode'
  ) THEN
    ALTER TABLE claims ADD COLUMN finance_payment_mode TEXT;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_claims_finance_payment_mode ON claims(finance_payment_mode);
    
    RAISE NOTICE 'finance_payment_mode column added to claims table';
  ELSE
    RAISE NOTICE 'finance_payment_mode column already exists in claims table';
  END IF;
END $$;
