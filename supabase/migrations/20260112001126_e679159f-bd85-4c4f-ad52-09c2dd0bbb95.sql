-- Add withdrawable_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawable_balance numeric DEFAULT 0.0;

-- Create payout_requests table for withdrawal system
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  bank_name text,
  account_number text,
  account_name text,
  admin_notes text,
  processed_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payout requests
CREATE POLICY "Users can view their own payout requests"
ON public.payout_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create payout requests
CREATE POLICY "Users can create payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests"
ON public.payout_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update payout requests
CREATE POLICY "Admins can update payout requests"
ON public.payout_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create live_streams table for WebRTC streaming
CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended', 'recording')),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  recording_url text,
  viewer_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Task participants can view streams
CREATE POLICY "Task participants can view streams"
ON public.live_streams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = live_streams.task_id 
    AND (tasks.requester_id = auth.uid() OR tasks.voucher_id = auth.uid())
  )
);

-- Vouchers can create streams for their tasks
CREATE POLICY "Vouchers can create streams"
ON public.live_streams
FOR INSERT
WITH CHECK (
  voucher_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = live_streams.task_id 
    AND tasks.voucher_id = auth.uid()
    AND tasks.status = 'assigned'
  )
);

-- Vouchers can update their streams
CREATE POLICY "Vouchers can update their streams"
ON public.live_streams
FOR UPDATE
USING (voucher_id = auth.uid());

-- Admins can view all streams
CREATE POLICY "Admins can view all streams"
ON public.live_streams
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for live_streams
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;