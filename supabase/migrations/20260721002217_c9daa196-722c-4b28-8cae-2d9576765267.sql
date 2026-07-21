
-- 1. Fix verification-videos storage policies
DROP POLICY IF EXISTS "Authenticated users can upload verification videos" ON storage.objects;
DROP POLICY IF EXISTS "Task participants can view verification videos" ON storage.objects;
DROP POLICY IF EXISTS "Vouchers can upload verification videos" ON storage.objects;

CREATE POLICY "Assigned voucher can upload verification videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-videos'
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND t.voucher_id = auth.uid()
  )
);

CREATE POLICY "Task participants can view verification videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-videos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.requester_id = auth.uid() OR t.voucher_id = auth.uid())
    )
  )
);

-- 2. Revoke anon and public EXECUTE from all app-owned SECURITY DEFINER funcs
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND pg_get_userbyid(p.proowner)='postgres'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 3. Revoke authenticated EXECUTE from trigger-only and admin/internal helpers
REVOKE EXECUTE ON FUNCTION public.trigger_recalculate_vouchscore() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_task_completion_rewards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_task_status_vouchscore() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_streak_on_completion(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_vouchscore(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_vouch_credits(uuid, integer, text, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_user_role(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_signup_role(app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_credit_wallet(uuid, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_debit_wallet(uuid, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_wallets_map() FROM authenticated;
