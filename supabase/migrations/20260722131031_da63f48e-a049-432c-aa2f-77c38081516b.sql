
DROP POLICY IF EXISTS certificates_public_read ON public.certificates;

CREATE OR REPLACE FUNCTION public.hash_team_member_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_pin_code IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.staff_pin_code IS DISTINCT FROM OLD.staff_pin_code) THEN
    IF NEW.staff_pin_code !~ '^[0-9a-f]{64}$' THEN
      NEW.staff_pin_code := public.hash_pin_code(NEW.staff_pin_code);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_team_member_pin ON public.team_members;
CREATE TRIGGER trg_hash_team_member_pin
  BEFORE INSERT OR UPDATE OF staff_pin_code ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.hash_team_member_pin();

UPDATE public.team_members
SET staff_pin_code = public.hash_pin_code(staff_pin_code)
WHERE staff_pin_code IS NOT NULL
  AND staff_pin_code !~ '^[0-9a-f]{64}$';

REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (is_read) ON public.messages TO authenticated;

DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;
CREATE POLICY "Receivers can mark messages as read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.initialize_first_admin(uuid, text) FROM PUBLIC, anon, authenticated;
