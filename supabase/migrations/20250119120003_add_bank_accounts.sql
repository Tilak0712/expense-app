-- Add bank_account column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- Add company_bank_account to profiles (for finance users)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_bank_account TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_bank_account ON profiles(bank_account);
