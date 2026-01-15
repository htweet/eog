-- Create withdrawal_settings table for storing user bank details
CREATE TABLE IF NOT EXISTS public.withdrawal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own withdrawal settings"
ON public.withdrawal_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own withdrawal settings"
ON public.withdrawal_settings FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own withdrawal settings"
ON public.withdrawal_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_withdrawal_settings_updated_at
BEFORE UPDATE ON public.withdrawal_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();