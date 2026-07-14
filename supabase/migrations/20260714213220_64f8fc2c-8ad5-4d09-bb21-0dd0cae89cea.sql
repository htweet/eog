
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
ON public.platform_settings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

DO $$
DECLARE r record;
BEGIN
  -- Fully revoke trigger-only functions
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND p.proname IN ('handle_new_user','assign_signup_role')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.nspname, r.proname, r.args);
  END LOOP;

  -- Revoke anon on client-callable RPCs
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND pg_get_userbyid(p.proowner) = 'postgres'
      AND p.proname IN (
        'get_my_wallet','admin_debit_wallet','admin_get_wallets_map','admin_credit_wallet',
        'create_notification','release_escrow','refund_escrow','verify_checkin',
        'request_withdrawal_secure','add_funds_secure','withdraw_funds_secure','hold_escrow_secure',
        'get_public_profile','set_active_role','verify_team_member_pin','process_deposit_secure',
        'claim_task_secure'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;
