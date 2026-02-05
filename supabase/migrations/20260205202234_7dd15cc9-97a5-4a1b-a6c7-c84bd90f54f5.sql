-- Add active_role column to profiles to persist user's preferred role view
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_role text DEFAULT NULL;

-- Create function to update active role
CREATE OR REPLACE FUNCTION public.set_active_role(p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_role boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user has this role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = p_role::app_role
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN json_build_object('success', false, 'error', 'User does not have this role');
  END IF;

  -- Update active role
  UPDATE public.profiles 
  SET active_role = p_role
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'active_role', p_role);
END;
$$;

-- Create function to add a new role to user
CREATE OR REPLACE FUNCTION public.add_user_role(p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_role boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user already has this role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = p_role::app_role
  ) INTO v_has_role;

  IF v_has_role THEN
    RETURN json_build_object('success', false, 'error', 'User already has this role');
  END IF;

  -- Insert new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role::app_role);

  -- Set as active role
  UPDATE public.profiles 
  SET active_role = p_role
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'role', p_role);
END;
$$;

-- Function to get user's roles and active role
CREATE OR REPLACE FUNCTION public.get_user_roles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_roles text[];
  v_active_role text;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('roles', ARRAY[]::text[], 'active_role', null, 'is_admin', false);
  END IF;

  -- Get all roles
  SELECT array_agg(role::text) INTO v_roles
  FROM public.user_roles
  WHERE user_id = v_user_id;

  -- Get active role
  SELECT active_role INTO v_active_role
  FROM public.profiles
  WHERE id = v_user_id;

  -- Check if admin
  v_is_admin := 'admin' = ANY(v_roles);

  -- If no active role set, use first non-admin role or admin
  IF v_active_role IS NULL AND v_roles IS NOT NULL THEN
    IF v_is_admin AND array_length(v_roles, 1) = 1 THEN
      v_active_role := 'admin';
    ELSE
      SELECT role::text INTO v_active_role
      FROM public.user_roles
      WHERE user_id = v_user_id AND role != 'admin'
      LIMIT 1;
    END IF;
  END IF;

  RETURN json_build_object(
    'roles', COALESCE(v_roles, ARRAY[]::text[]),
    'active_role', v_active_role,
    'is_admin', v_is_admin
  );
END;
$$;