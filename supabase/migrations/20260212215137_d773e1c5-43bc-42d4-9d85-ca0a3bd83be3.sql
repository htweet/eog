
-- Make verification-videos bucket public so videos can be viewed in review
UPDATE storage.buckets SET public = true WHERE id = 'verification-videos';

-- Add SELECT policy for public access to verification videos
CREATE POLICY "Public can view verification videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-videos');

-- Allow authenticated users to upload to verification-videos
CREATE POLICY "Authenticated users can upload verification videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verification-videos' AND auth.uid() IS NOT NULL);
