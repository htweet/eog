
-- =====================================================
-- SECURITY FIX: Wallet Operations & Profile Protection
-- =====================================================

-- 1. CREATE SECURE RPC FUNCTIONS FOR WALLET OPERATIONS
-- These replace client-side wallet manipulations with atomic, server-side operations

-- Add funds securely (for use after payment verification)
CREATE OR REPLACE FUNCTION public.add_funds_secure(p_amount NUMERIC, p_description TEXT DEFAULT 'Funds added')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  IF p_amount > 10000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds maximum limit');
  END IF;
  
  -- Lock row for update to prevent race conditions
  PERFORM * FROM profiles WHERE id = auth.uid() FOR UPDATE;
  
  -- Atomic update
  UPDATE profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount 
  WHERE id = auth.uid();
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (auth.uid(), 'deposit', p_amount, 'completed', p_description);
  
  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;

-- Withdraw funds securely
CREATE OR REPLACE FUNCTION public.withdraw_funds_secure(
  p_amount NUMERIC, 
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_current_withdrawable NUMERIC;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Lock row for update
  SELECT wallet_balance, withdrawable_balance 
  INTO v_current_balance, v_current_withdrawable
  FROM profiles 
  WHERE id = auth.uid() 
  FOR UPDATE;
  
  IF v_current_withdrawable IS NULL OR v_current_withdrawable < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient withdrawable balance');
  END IF;
  
  -- Deduct from withdrawable balance
  UPDATE profiles 
  SET withdrawable_balance = COALESCE(withdrawable_balance, 0) - p_amount
  WHERE id = auth.uid();
  
  -- Create payout request
  INSERT INTO payout_requests (user_id, amount, bank_name, account_number, account_name, status)
  VALUES (auth.uid(), p_amount, p_bank_name, p_account_number, p_account_name, 'pending');
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (auth.uid(), 'withdrawal', -p_amount, 'pending', 'Withdrawal request submitted');
  
  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;

-- Hold escrow securely (for task creation)
CREATE OR REPLACE FUNCTION public.hold_escrow_secure(
  p_task_id UUID,
  p_amount NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_task_exists BOOLEAN;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Verify task belongs to user
  SELECT EXISTS(
    SELECT 1 FROM tasks 
    WHERE id = p_task_id AND requester_id = auth.uid()
  ) INTO v_task_exists;
  
  IF NOT v_task_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or unauthorized');
  END IF;
  
  -- Lock row for update
  SELECT wallet_balance INTO v_current_balance
  FROM profiles 
  WHERE id = auth.uid() 
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Deduct from wallet, add to escrow
  UPDATE profiles 
  SET 
    wallet_balance = COALESCE(wallet_balance, 0) - p_amount,
    escrow_balance = COALESCE(escrow_balance, 0) + p_amount
  WHERE id = auth.uid();
  
  -- Create escrow transaction
  INSERT INTO escrow_transactions (task_id, requester_id, amount, status)
  VALUES (p_task_id, auth.uid(), p_amount, 'held');
  
  -- Create transaction record
  INSERT INTO transactions (user_id, task_id, type, amount, status, description)
  VALUES (auth.uid(), p_task_id, 'escrow_hold', -p_amount, 'completed', 'Bounty held in escrow');
  
  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;

-- 2. UPDATE PROFILE RLS POLICY TO RESTRICT SENSITIVE FIELD UPDATES
-- Drop existing policy and create restricted version
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update safe profile fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent modification of system-managed financial fields
    wallet_balance IS NOT DISTINCT FROM (SELECT wallet_balance FROM profiles WHERE id = auth.uid()) AND
    withdrawable_balance IS NOT DISTINCT FROM (SELECT withdrawable_balance FROM profiles WHERE id = auth.uid()) AND
    escrow_balance IS NOT DISTINCT FROM (SELECT escrow_balance FROM profiles WHERE id = auth.uid()) AND
    trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM profiles WHERE id = auth.uid()) AND
    is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM profiles WHERE id = auth.uid()) AND
    voucher_tier IS NOT DISTINCT FROM (SELECT voucher_tier FROM profiles WHERE id = auth.uid())
  );

-- 3. RESTRICT PUBLIC PROFILE VISIBILITY TO HIDE SENSITIVE DATA
-- Drop existing public profile policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create restricted public view - only authenticated users can see profiles
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Create a safe public profile view function
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_profile RECORD;
BEGIN
  v_is_owner := (auth.uid() = p_user_id);
  
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Return full data to owner, limited data to others
  IF v_is_owner THEN
    RETURN jsonb_build_object(
      'id', v_profile.id,
      'full_name', v_profile.full_name,
      'avatar_url', v_profile.avatar_url,
      'bio', v_profile.bio,
      'trust_score', v_profile.trust_score,
      'is_verified', v_profile.is_verified,
      'voucher_tier', v_profile.voucher_tier,
      'wallet_balance', v_profile.wallet_balance,
      'withdrawable_balance', v_profile.withdrawable_balance,
      'escrow_balance', v_profile.escrow_balance,
      'is_online', v_profile.is_online,
      'created_at', v_profile.created_at
    );
  ELSE
    -- Public view - exclude financial and location data
    RETURN jsonb_build_object(
      'id', v_profile.id,
      'full_name', v_profile.full_name,
      'avatar_url', v_profile.avatar_url,
      'bio', v_profile.bio,
      'trust_score', v_profile.trust_score,
      'is_verified', v_profile.is_verified,
      'voucher_tier', v_profile.voucher_tier,
      'is_online', v_profile.is_online,
      'created_at', v_profile.created_at
    );
  END IF;
END;
$$;

-- 4. GRANT EXECUTE PERMISSIONS ON SECURE FUNCTIONS
GRANT EXECUTE ON FUNCTION public.add_funds_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_funds_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.hold_escrow_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile TO authenticated;
