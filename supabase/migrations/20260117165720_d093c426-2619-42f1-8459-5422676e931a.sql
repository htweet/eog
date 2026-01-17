
-- Create enums for Pro system
DO $$ BEGIN
  CREATE TYPE public.voucher_tier AS ENUM ('standard', 'pro', 'pending_pro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_tier AS ENUM ('any', 'pro_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.escrow_status AS ENUM ('held', 'released', 'refunded', 'disputed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.staff_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add Pro columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voucher_tier voucher_tier DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS company_details jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS escrow_balance numeric DEFAULT 0.0;

-- Add required_tier to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS required_tier task_tier DEFAULT 'any',
ADD COLUMN IF NOT EXISTS pro_fee_multiplier numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS description text;

-- Add assigned_staff_id to verifications
ALTER TABLE public.verifications 
ADD COLUMN IF NOT EXISTS assigned_staff_id uuid;

-- Create team_members table for Pro agency staff
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_company_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  staff_email text NOT NULL,
  staff_pin_code text NOT NULL,
  status staff_status DEFAULT 'pending',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_company_id, staff_email)
);

-- Create escrow_transactions table for detailed escrow tracking
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voucher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  platform_fee numeric DEFAULT 0,
  status escrow_status DEFAULT 'held',
  held_at timestamptz DEFAULT now(),
  released_at timestamptz,
  refunded_at timestamptz,
  processed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pro_upgrade_requests table for business verification
CREATE TABLE IF NOT EXISTS public.pro_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  registration_number text NOT NULL,
  document_urls jsonb DEFAULT '[]',
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create platform_settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('platform_fee_percent', '10', 'Platform fee percentage on each transaction'),
  ('pro_fee_multiplier', '1.4', 'Price multiplier for Pro tasks (40% extra)'),
  ('min_bounty_amount', '500', 'Minimum bounty amount in Naira'),
  ('max_bounty_amount', '500000', 'Maximum bounty amount in Naira'),
  ('enable_pro_mode', 'true', 'Enable/disable Pro voucher features'),
  ('enable_escrow', 'true', 'Enable/disable escrow system'),
  ('escrow_auto_release_days', '7', 'Days before auto-releasing escrow after completion')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Pro users can manage their team members"
ON public.team_members
FOR ALL
USING (parent_company_id = auth.uid())
WITH CHECK (parent_company_id = auth.uid());

CREATE POLICY "Staff can view their own record"
ON public.team_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all team members"
ON public.team_members
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for escrow_transactions
CREATE POLICY "Requesters can view their escrow transactions"
ON public.escrow_transactions
FOR SELECT
USING (requester_id = auth.uid());

CREATE POLICY "Vouchers can view escrow for their tasks"
ON public.escrow_transactions
FOR SELECT
USING (voucher_id = auth.uid());

CREATE POLICY "Authenticated users can create escrow"
ON public.escrow_transactions
FOR INSERT
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can manage all escrow transactions"
ON public.escrow_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for pro_upgrade_requests
CREATE POLICY "Users can view their own upgrade request"
ON public.pro_upgrade_requests
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create upgrade request"
ON public.pro_upgrade_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all upgrade requests"
ON public.pro_upgrade_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for platform_settings
CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_upgrade_requests;

-- Create triggers for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escrow_transactions_updated_at
BEFORE UPDATE ON public.escrow_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pro_upgrade_requests_updated_at
BEFORE UPDATE ON public.pro_upgrade_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to process escrow release
CREATE OR REPLACE FUNCTION public.release_escrow(
  p_task_id uuid,
  p_voucher_id uuid,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow escrow_transactions%ROWTYPE;
  v_platform_fee numeric;
  v_voucher_payout numeric;
  v_fee_percent numeric;
BEGIN
  -- Get escrow record
  SELECT * INTO v_escrow FROM escrow_transactions 
  WHERE task_id = p_task_id AND status = 'held'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No held escrow found');
  END IF;
  
  -- Get platform fee percentage
  SELECT (setting_value)::numeric INTO v_fee_percent 
  FROM platform_settings WHERE setting_key = 'platform_fee_percent';
  v_fee_percent := COALESCE(v_fee_percent, 10);
  
  -- Calculate fees
  v_platform_fee := v_escrow.amount * (v_fee_percent / 100);
  v_voucher_payout := v_escrow.amount - v_platform_fee;
  
  -- Update escrow status
  UPDATE escrow_transactions 
  SET 
    status = 'released',
    voucher_id = p_voucher_id,
    released_at = now(),
    platform_fee = v_platform_fee,
    processed_by = COALESCE(p_admin_id, auth.uid()),
    updated_at = now()
  WHERE id = v_escrow.id;
  
  -- Credit voucher's withdrawable balance
  UPDATE profiles 
  SET withdrawable_balance = COALESCE(withdrawable_balance, 0) + v_voucher_payout
  WHERE id = p_voucher_id;
  
  -- Create transaction records
  INSERT INTO transactions (user_id, task_id, type, amount, status, description)
  VALUES 
    (v_escrow.requester_id, p_task_id, 'bounty_paid', -v_escrow.amount, 'completed', 'Bounty released from escrow'),
    (p_voucher_id, p_task_id, 'bounty_earned', v_voucher_payout, 'completed', 'Bounty earned (minus ' || v_fee_percent || '% platform fee)');
  
  RETURN jsonb_build_object(
    'success', true, 
    'amount', v_escrow.amount,
    'platform_fee', v_platform_fee,
    'voucher_payout', v_voucher_payout
  );
END;
$$;

-- Create function to refund escrow
CREATE OR REPLACE FUNCTION public.refund_escrow(
  p_task_id uuid,
  p_admin_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Refund processed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow escrow_transactions%ROWTYPE;
BEGIN
  -- Get escrow record
  SELECT * INTO v_escrow FROM escrow_transactions 
  WHERE task_id = p_task_id AND status = 'held'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No held escrow found');
  END IF;
  
  -- Update escrow status
  UPDATE escrow_transactions 
  SET 
    status = 'refunded',
    refunded_at = now(),
    processed_by = COALESCE(p_admin_id, auth.uid()),
    notes = p_reason,
    updated_at = now()
  WHERE id = v_escrow.id;
  
  -- Refund to requester's wallet
  UPDATE profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_escrow.amount
  WHERE id = v_escrow.requester_id;
  
  -- Create refund transaction
  INSERT INTO transactions (user_id, task_id, type, amount, status, description)
  VALUES (v_escrow.requester_id, p_task_id, 'escrow_release', v_escrow.amount, 'completed', 'Escrow refunded: ' || p_reason);
  
  RETURN jsonb_build_object('success', true, 'amount', v_escrow.amount);
END;
$$;
