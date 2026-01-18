-- ============================================
-- COMPREHENSIVE SECURITY & FEATURE FIX MIGRATION
-- ============================================

-- 1. Enable pgcrypto for password hashing if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create function to hash team member PIN codes
CREATE OR REPLACE FUNCTION hash_pin_code(pin_code TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT encode(digest(pin_code, 'sha256'), 'hex')
$$;

-- 3. Create secure function to verify PIN codes without exposing them
CREATE OR REPLACE FUNCTION verify_team_member_pin(
  p_team_member_id UUID,
  p_pin_code TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
  v_input_hash TEXT;
BEGIN
  -- Get stored PIN hash
  SELECT staff_pin_code INTO v_stored_hash
  FROM team_members
  WHERE id = p_team_member_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Hash input PIN
  v_input_hash := encode(digest(p_pin_code, 'sha256'), 'hex');
  
  RETURN v_stored_hash = v_input_hash;
END;
$$;

-- 4. Create secure function to add funds using RPC (already exists, but enhance for deposits)
CREATE OR REPLACE FUNCTION process_deposit_secure(
  p_amount NUMERIC,
  p_tx_ref TEXT,
  p_transaction_id TEXT
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;
  
  -- Check if transaction already processed (idempotency)
  SELECT EXISTS(
    SELECT 1 FROM transactions 
    WHERE user_id = v_user_id 
    AND description LIKE '%' || COALESCE(p_tx_ref, p_transaction_id) || '%'
    AND status = 'completed'
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already processed');
  END IF;
  
  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM profiles WHERE id = v_user_id;
  
  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance + p_amount;
  
  -- Atomic update
  UPDATE profiles 
  SET wallet_balance = v_new_balance
  WHERE id = v_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (
    v_user_id, 
    'deposit', 
    p_amount, 
    'completed', 
    'Flutterwave deposit - ' || COALESCE(p_tx_ref, p_transaction_id)
  );
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    v_user_id,
    'deposit_success',
    'Deposit Successful',
    'Your deposit of ₦' || p_amount::TEXT || ' has been credited to your wallet.'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'new_balance', v_new_balance,
    'amount', p_amount
  );
END;
$$;

-- 5. Create atomic task claim function with notification
CREATE OR REPLACE FUNCTION claim_task_secure(p_task_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_requester_id UUID;
  v_task_title TEXT;
  v_task_status TEXT;
  v_rows_updated INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify user is a voucher
  IF NOT has_role(v_user_id, 'voucher') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be a voucher to claim tasks');
  END IF;
  
  -- Get task info and lock it
  SELECT requester_id, title, status 
  INTO v_requester_id, v_task_title, v_task_status
  FROM tasks
  WHERE id = p_task_id
  FOR UPDATE;
  
  IF v_task_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF v_task_status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task is no longer available');
  END IF;
  
  IF v_requester_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot claim your own task');
  END IF;
  
  -- Atomically claim the task
  UPDATE tasks 
  SET voucher_id = v_user_id, status = 'assigned'
  WHERE id = p_task_id AND status = 'open';
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task was claimed by someone else');
  END IF;
  
  -- Create notification for requester (same transaction)
  INSERT INTO notifications (user_id, type, title, message, task_id)
  VALUES (
    v_requester_id,
    'task_claimed',
    'Task Claimed',
    'A voucher has claimed your task "' || v_task_title || '"',
    p_task_id
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Create function to get verification video URL securely  
CREATE OR REPLACE FUNCTION get_verification_video_url(p_task_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_video_path TEXT;
  v_is_participant BOOLEAN;
BEGIN
  -- Check if user is task participant
  SELECT EXISTS(
    SELECT 1 FROM tasks
    WHERE id = p_task_id
    AND (requester_id = auth.uid() OR voucher_id = auth.uid())
  ) INTO v_is_participant;
  
  IF NOT v_is_participant AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
  -- Get video path from verifications
  SELECT video_url INTO v_video_path
  FROM verifications
  WHERE task_id = p_task_id
  ORDER BY submitted_at DESC
  LIMIT 1;
  
  RETURN v_video_path;
END;
$$;

-- 7. Improve the has_role function with null checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION hash_pin_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_team_member_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_deposit_secure(NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_task_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_video_url(UUID) TO authenticated;