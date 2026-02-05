-- Create secure RPC function to get escrow info for vouchers (hides platform_fee)
CREATE OR REPLACE FUNCTION public.get_escrow_summary(p_task_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_escrow RECORD;
  v_is_requester BOOLEAN;
  v_is_voucher BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if user is admin
  v_is_admin := has_role(v_user_id, 'admin'::app_role);
  
  -- Get escrow transaction
  SELECT e.*, t.requester_id, t.voucher_id as task_voucher_id
  INTO v_escrow
  FROM escrow_transactions e
  JOIN tasks t ON t.id = e.task_id
  WHERE e.task_id = p_task_id
  ORDER BY e.created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No escrow found');
  END IF;
  
  v_is_requester := v_escrow.requester_id = v_user_id;
  v_is_voucher := v_escrow.task_voucher_id = v_user_id;
  
  -- Must be participant or admin
  IF NOT v_is_requester AND NOT v_is_voucher AND NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Return appropriate data based on role
  -- Vouchers don't see platform_fee details, only their payout
  IF v_is_voucher AND NOT v_is_admin THEN
    RETURN json_build_object(
      'success', true,
      'id', v_escrow.id,
      'task_id', v_escrow.task_id,
      'status', v_escrow.status,
      'held_at', v_escrow.held_at,
      'released_at', v_escrow.released_at,
      'estimated_payout', v_escrow.amount - COALESCE(v_escrow.platform_fee, 0)
    );
  END IF;
  
  -- Requesters and admins see full details
  RETURN json_build_object(
    'success', true,
    'id', v_escrow.id,
    'task_id', v_escrow.task_id,
    'requester_id', v_escrow.requester_id,
    'voucher_id', v_escrow.voucher_id,
    'amount', v_escrow.amount,
    'platform_fee', v_escrow.platform_fee,
    'status', v_escrow.status,
    'held_at', v_escrow.held_at,
    'released_at', v_escrow.released_at,
    'refunded_at', v_escrow.refunded_at,
    'notes', v_escrow.notes
  );
END;
$$;

-- Create secure RPC function to get fuzzy task location for open tasks
CREATE OR REPLACE FUNCTION public.get_task_location(p_task_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_task RECORD;
  v_is_participant BOOLEAN;
  v_is_admin BOOLEAN;
  v_fuzzy_lat NUMERIC;
  v_fuzzy_lng NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  v_is_participant := v_task.requester_id = v_user_id OR v_task.voucher_id = v_user_id;
  v_is_admin := has_role(v_user_id, 'admin'::app_role);
  
  -- If assigned/completed task or user is participant/admin, return exact location
  IF v_task.status != 'open' OR v_is_participant OR v_is_admin THEN
    RETURN json_build_object(
      'success', true,
      'latitude', v_task.latitude,
      'longitude', v_task.longitude,
      'address', v_task.address,
      'is_exact', true
    );
  END IF;
  
  -- For open tasks, return fuzzy location (within ~500m radius)
  -- Add random offset between -0.005 and 0.005 degrees (roughly 500m)
  IF v_task.latitude IS NOT NULL AND v_task.longitude IS NOT NULL THEN
    v_fuzzy_lat := v_task.latitude + (random() - 0.5) * 0.01;
    v_fuzzy_lng := v_task.longitude + (random() - 0.5) * 0.01;
  ELSE
    v_fuzzy_lat := NULL;
    v_fuzzy_lng := NULL;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'latitude', v_fuzzy_lat,
    'longitude', v_fuzzy_lng,
    'address', split_part(v_task.address, ',', 1) || ' Area', -- Only show general area
    'is_exact', false
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_escrow_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_location(UUID) TO authenticated;