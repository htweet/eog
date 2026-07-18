
-- Revoke anon EXECUTE on all custom SECURITY DEFINER functions (st_estimatedextent is PostGIS system, skip)
REVOKE EXECUTE ON FUNCTION public.add_user_role(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_verification_video_url(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid) FROM anon, authenticated, PUBLIC;
