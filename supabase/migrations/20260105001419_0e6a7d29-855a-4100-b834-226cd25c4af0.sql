-- 1. Create Role Enum
CREATE TYPE public.app_role AS ENUM ('requester', 'voucher', 'admin');

-- 2. Create User Roles Table (Security-First Approach)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Definer Function for Role Checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS Policies for User Roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own role on signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('requester', 'voucher'));

-- 5. Create Profiles Table (WITHOUT role column)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  trust_score NUMERIC DEFAULT 5.0,
  bio TEXT,
  wallet_balance NUMERIC DEFAULT 0.0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RLS Policies for Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 8. Create Tasks Table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) NOT NULL,
  voucher_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  bounty_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'pending_review', 'completed', 'disputed')),
  checklist JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for Tasks
CREATE POLICY "Authenticated users can view open tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (status = 'open' OR requester_id = auth.uid() OR voucher_id = auth.uid());

CREATE POLICY "Requesters can create tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid() AND public.has_role(auth.uid(), 'requester'));

CREATE POLICY "Requesters can update their own tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Vouchers can claim open tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    status = 'open' AND public.has_role(auth.uid(), 'voucher')
  );

-- 10. Create Verifications Table
CREATE TABLE public.verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) NOT NULL,
  video_url TEXT NOT NULL,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  device_timestamp TIMESTAMP WITH TIME ZONE,
  ai_analysis_score NUMERIC,
  completed_checklist JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies for Verifications
CREATE POLICY "Task participants can view verifications"
  ON public.verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = verifications.task_id
      AND (tasks.requester_id = auth.uid() OR tasks.voucher_id = auth.uid())
    )
  );

CREATE POLICY "Assigned vouchers can submit verifications"
  ON public.verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id
      AND tasks.voucher_id = auth.uid()
      AND tasks.status = 'assigned'
    )
  );

-- 12. Create Reviews Table
CREATE TABLE public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies for Reviews
CREATE POLICY "Anyone can read reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Task participants can create reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_id
      AND tasks.status = 'completed'
      AND (tasks.requester_id = auth.uid() OR tasks.voucher_id = auth.uid())
    )
  );

-- 14. Create Storage Bucket for Verification Videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-videos', 'verification-videos', false);

-- 15. Storage Policies
CREATE POLICY "Vouchers can upload verification videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-videos' AND
    public.has_role(auth.uid(), 'voucher')
  );

CREATE POLICY "Task participants can view verification videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-videos'
  );

-- 16. Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verifications;