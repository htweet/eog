
-- Pricing plans table (admin-managed)
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  badge_text text,
  is_popular boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.pricing_plans
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.pricing_plans
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.pricing_plans(id),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create subscriptions" ON public.user_subscriptions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions" ON public.user_subscriptions
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default pricing plans
INSERT INTO public.pricing_plans (name, description, price, billing_period, features, sort_order, badge_text, is_popular) VALUES
('Free', 'Perfect for getting started', 0, 'monthly', '["Up to 3 tasks/month", "Basic verification", "Standard support", "Community access"]'::jsonb, 0, NULL, false),
('Pro', 'For power users and agencies', 4999, 'monthly', '["Unlimited tasks", "Priority verification", "AI-powered checklists", "Live streaming", "Dedicated support", "Agency dashboard"]'::jsonb, 1, 'Most Popular', true),
('Enterprise', 'For large organizations', 19999, 'monthly', '["Everything in Pro", "Custom SLAs", "API access", "White-label option", "Bulk task creation", "24/7 priority support", "Custom integrations"]'::jsonb, 2, 'Best Value', false);
