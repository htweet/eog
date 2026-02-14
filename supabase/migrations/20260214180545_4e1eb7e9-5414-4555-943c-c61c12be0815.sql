
-- Add KYC fields to pro_upgrade_requests for agency verification
ALTER TABLE public.pro_upgrade_requests 
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_id_type text,
  ADD COLUMN IF NOT EXISTS kyc_id_number text,
  ADD COLUMN IF NOT EXISTS kyc_address text,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS kyc_notes text;

-- Add subscription billing tab to admin sidebar tracking
-- Add billing_status column to user_subscriptions for admin management
ALTER TABLE public.user_subscriptions 
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Enable realtime for user_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
