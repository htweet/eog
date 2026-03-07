ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS ai_analysis_result jsonb;

CREATE POLICY "Admins can update verifications"
ON public.verifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));