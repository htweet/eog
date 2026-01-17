-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add current_location to profiles for geospatial queries
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_location geography(Point, 4326);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Create task_applications table for bid/select workflow
CREATE TABLE IF NOT EXISTS public.task_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  voucher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  bid_message text,
  distance_meters numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(task_id, voucher_id)
);

-- Enable RLS on task_applications
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_applications
CREATE POLICY "Users can view applications for their tasks"
  ON public.task_applications
  FOR SELECT
  USING (
    voucher_id = auth.uid() OR 
    task_id IN (SELECT id FROM public.tasks WHERE requester_id = auth.uid())
  );

CREATE POLICY "Vouchers can create applications"
  ON public.task_applications
  FOR INSERT
  WITH CHECK (voucher_id = auth.uid());

CREATE POLICY "Vouchers can update their own applications"
  ON public.task_applications
  FOR UPDATE
  USING (voucher_id = auth.uid());

CREATE POLICY "Requesters can update applications for their tasks"
  ON public.task_applications
  FOR UPDATE
  USING (task_id IN (SELECT id FROM public.tasks WHERE requester_id = auth.uid()));

-- Create spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles USING GIST (current_location);

-- Enable realtime for task_applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;