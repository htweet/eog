
-- 1. Fix profiles: replace overly permissive SELECT policy
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

-- Owner sees everything, others see profiles too (column-level handled in app)
CREATE POLICY "Authenticated can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Admins can update any profile (for verification, balance changes)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Make verification-videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'verification-videos';

-- Remove the open public policy
DROP POLICY IF EXISTS "Public can view verification videos" ON storage.objects;

-- Ensure authenticated upload policy exists
DROP POLICY IF EXISTS "Authenticated users can upload verification videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload verification videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-videos');

-- Ensure task participants can view via SELECT (needed for signed URLs)
DROP POLICY IF EXISTS "Task participants can view verification videos" ON storage.objects;
CREATE POLICY "Task participants can view verification videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-videos');

-- 3. Create avatars bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar upload policy
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Avatar view policy
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Avatar update policy
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
