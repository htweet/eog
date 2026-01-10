-- Fix the claim task RLS policy - vouchers need UPDATE permission on open tasks
DROP POLICY IF EXISTS "Vouchers can claim open tasks" ON public.tasks;

CREATE POLICY "Vouchers can claim open tasks" 
ON public.tasks 
FOR UPDATE 
TO authenticated
USING (status = 'open' AND has_role(auth.uid(), 'voucher'))
WITH CHECK (status = 'open' AND has_role(auth.uid(), 'voucher'));

-- Admin policies for full access
CREATE POLICY "Admins can view all tasks" 
ON public.tasks 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tasks" 
ON public.tasks 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all verifications" 
ON public.verifications 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));