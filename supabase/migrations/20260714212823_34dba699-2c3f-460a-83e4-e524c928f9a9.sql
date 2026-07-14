
-- Fix: profile_wallet_exposed — restrict financial column reads via column privileges + RPC
REVOKE SELECT (wallet_balance, withdrawable_balance, escrow_balance) ON public.profiles FROM authenticated;
REVOKE SELECT (wallet_balance, withdrawable_balance, escrow_balance) ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS TABLE(wallet_balance numeric, withdrawable_balance numeric, escrow_balance numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.wallet_balance, p.withdrawable_balance, p.escrow_balance
  FROM public.profiles p WHERE p.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_wallets_map()
RETURNS TABLE(user_id uuid, wallet_balance numeric, withdrawable_balance numeric, escrow_balance numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT p.id, p.wallet_balance, p.withdrawable_balance, p.escrow_balance FROM public.profiles p;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_wallets_map() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_credit_wallet(p_user_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
    WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_debit_wallet(p_user_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  UPDATE public.profiles
    SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - p_amount)
    WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_debit_wallet(uuid, numeric) TO authenticated;

-- Fix: notification_insert_any_user — restrict INSERT to own user_id
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix: messages_unauthorized_update — receivers may only toggle is_read; content immutable
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Receivers can mark messages as read"
ON public.messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (
  receiver_id = auth.uid()
  AND sender_id   = (SELECT m.sender_id FROM public.messages m WHERE m.id = messages.id)
  AND task_id     = (SELECT m.task_id   FROM public.messages m WHERE m.id = messages.id)
  AND content     = (SELECT m.content   FROM public.messages m WHERE m.id = messages.id)
  AND created_at  IS NOT DISTINCT FROM (SELECT m.created_at FROM public.messages m WHERE m.id = messages.id)
);

-- Fix: user_roles_self_assignment — remove client INSERT policy, use SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.assign_signup_role(p_role app_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_role NOT IN ('requester'::app_role, 'voucher'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid signup role');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = p_role) THEN
    RETURN jsonb_build_object('success', true);
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, p_role);
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.assign_signup_role(app_role) TO authenticated;

-- Fix: payout_requests_bank_details_exposure — belt-and-suspenders restrictive SELECT
DROP POLICY IF EXISTS "Restrict payout SELECT to owner or admin" ON public.payout_requests;
CREATE POLICY "Restrict payout SELECT to owner or admin"
ON public.payout_requests AS RESTRICTIVE
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
