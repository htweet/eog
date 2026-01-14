-- Drop the existing policy that has the incorrect WITH CHECK expression
DROP POLICY IF EXISTS "Vouchers can claim open tasks" ON public.tasks;

-- Recreate with correct WITH CHECK expression that allows status to change to 'assigned'
CREATE POLICY "Vouchers can claim open tasks" 
ON public.tasks 
FOR UPDATE 
TO authenticated
USING ((status = 'open'::text) AND has_role(auth.uid(), 'voucher'::app_role))
WITH CHECK (
  (status = 'assigned'::text) 
  AND (voucher_id = auth.uid()) 
  AND has_role(auth.uid(), 'voucher'::app_role)
);