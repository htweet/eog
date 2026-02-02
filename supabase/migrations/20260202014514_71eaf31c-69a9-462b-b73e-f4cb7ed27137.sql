-- Create messages table for chat system
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS policies
CREATE POLICY "Users can view messages they sent or received"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages for their tasks"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id
      AND (tasks.requester_id = auth.uid() OR tasks.voucher_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (receiver_id = auth.uid());

-- Create disputes table for dispute resolution workflow
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id),
  voucher_id uuid REFERENCES public.profiles(id),
  reason text NOT NULL,
  evidence_urls jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'refunded')),
  resolution_notes text,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

-- Enable RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Disputes RLS policies
CREATE POLICY "Task participants can view their disputes"
  ON public.disputes FOR SELECT
  USING (requester_id = auth.uid() OR voucher_id = auth.uid());

CREATE POLICY "Task participants can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (requester_id = auth.uid() OR voucher_id = auth.uid());

CREATE POLICY "Admins can manage all disputes"
  ON public.disputes FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create dispute_messages table for admin communication
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'requester', 'voucher')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on dispute_messages
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- Dispute messages RLS
CREATE POLICY "Task participants can view dispute messages"
  ON public.dispute_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id
      AND (tasks.requester_id = auth.uid() OR tasks.voucher_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can send dispute messages"
  ON public.dispute_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Create voucher_checkins table for location tracking
CREATE TABLE IF NOT EXISTS public.voucher_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.profiles(id),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  distance_from_task numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  checked_in_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on voucher_checkins
ALTER TABLE public.voucher_checkins ENABLE ROW LEVEL SECURITY;

-- Voucher checkins RLS
CREATE POLICY "Task participants can view checkins"
  ON public.voucher_checkins FOR SELECT
  USING (
    voucher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id AND tasks.requester_id = auth.uid()
    )
  );

CREATE POLICY "Vouchers can create their own checkins"
  ON public.voucher_checkins FOR INSERT
  WITH CHECK (voucher_id = auth.uid());

-- Create avatars storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create dispute-evidence storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dispute evidence
CREATE POLICY "Task participants can view dispute evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-evidence'
    AND (
      has_role(auth.uid(), 'admin')
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Task participants can upload dispute evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update function for location check-in verification
CREATE OR REPLACE FUNCTION public.verify_checkin(
  p_task_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_max_distance_meters numeric DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_distance numeric;
  v_checkin_id uuid;
BEGIN
  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF v_task IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF v_task.voucher_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  IF v_task.latitude IS NULL OR v_task.longitude IS NULL THEN
    -- If no task location, auto-verify
    INSERT INTO voucher_checkins (task_id, voucher_id, latitude, longitude, distance_from_task, status)
    VALUES (p_task_id, auth.uid(), p_latitude, p_longitude, 0, 'verified')
    RETURNING id INTO v_checkin_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'checkin_id', v_checkin_id,
      'distance', 0,
      'verified', true
    );
  END IF;
  
  -- Calculate distance using Haversine formula (approximate)
  v_distance := 6371000 * acos(
    cos(radians(p_latitude)) * cos(radians(v_task.latitude)) *
    cos(radians(v_task.longitude) - radians(p_longitude)) +
    sin(radians(p_latitude)) * sin(radians(v_task.latitude))
  );
  
  -- Insert check-in record
  INSERT INTO voucher_checkins (
    task_id, 
    voucher_id, 
    latitude, 
    longitude, 
    distance_from_task, 
    status
  )
  VALUES (
    p_task_id,
    auth.uid(),
    p_latitude,
    p_longitude,
    v_distance,
    CASE WHEN v_distance <= p_max_distance_meters THEN 'verified' ELSE 'failed' END
  )
  RETURNING id INTO v_checkin_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', v_checkin_id,
    'distance', round(v_distance),
    'verified', v_distance <= p_max_distance_meters,
    'max_distance', p_max_distance_meters
  );
END;
$$;

-- Create secure withdrawal RPC function
CREATE OR REPLACE FUNCTION public.request_withdrawal_secure(
  p_amount numeric,
  p_bank_name text,
  p_account_number text,
  p_account_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance numeric;
  v_payout_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Get current withdrawable balance
  SELECT withdrawable_balance INTO v_current_balance
  FROM profiles WHERE id = v_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Deduct from withdrawable balance
  UPDATE profiles
  SET withdrawable_balance = withdrawable_balance - p_amount
  WHERE id = v_user_id;
  
  -- Create payout request
  INSERT INTO payout_requests (
    user_id, amount, bank_name, account_number, account_name, status
  ) VALUES (
    v_user_id, p_amount, p_bank_name, p_account_number, p_account_name, 'pending'
  )
  RETURNING id INTO v_payout_id;
  
  -- Create transaction record
  INSERT INTO transactions (
    user_id, type, amount, status, description
  ) VALUES (
    v_user_id, 'withdrawal', -p_amount, 'pending', 'Withdrawal request pending approval'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'message', 'Withdrawal request submitted'
  );
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voucher_checkins;