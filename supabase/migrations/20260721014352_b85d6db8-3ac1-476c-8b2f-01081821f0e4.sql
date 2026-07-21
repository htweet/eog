CREATE OR REPLACE FUNCTION public.submit_task_for_review(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF v_task IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  IF v_task.voucher_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: you are not the assigned voucher');
  END IF;

  IF v_task.status != 'assigned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task is not in assigned state', 'current_status', v_task.status);
  END IF;

  UPDATE tasks
  SET status = 'pending_review', updated_at = now()
  WHERE id = p_task_id;

  RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'new_status', 'pending_review');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_task_for_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_task_for_review(uuid) TO authenticated;