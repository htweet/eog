-- ============================================================
-- VOUCH 2.0 MEGA MIGRATION
-- VouchScore™ Algorithm | Vouch Credits | Streaks | Referrals
-- Flash Bounties | Guilds | Certificates
-- ============================================================

-- -------------------------------------------------------
-- 1. VOUCH CREDITS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouch_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- -------------------------------------------------------
-- 2. STREAKS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_type TEXT NOT NULL DEFAULT 'daily_login',  -- daily_login | task_completion
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- -------------------------------------------------------
-- 3. REFERRALS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | activated | rewarded
  referral_code TEXT NOT NULL,
  reward_amount NUMERIC(12,2) DEFAULT 500.00,
  vc_reward INTEGER DEFAULT 100,
  activated_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)  -- each user can only be referred once
);

-- Add referral_code to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS voucher_level TEXT DEFAULT 'bronze', -- bronze|silver|gold|platinum|elite
  ADD COLUMN IF NOT EXISTS vouchscore NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vouchscore_breakdown JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_tasks_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tasks_disputed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_gps_accuracy NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS avg_response_hours NUMERIC(10,2);

-- Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(MD5(id::text || 'vouch'), 1, 8))
WHERE referral_code IS NULL;

-- -------------------------------------------------------
-- 4. FLASH BOUNTIES FIELDS ON TASKS
-- -------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_flash BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS flash_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flash_multiplier NUMERIC(3,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_price_min NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS ai_price_max NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- -------------------------------------------------------
-- 5. GUILDS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guilds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_color TEXT DEFAULT '#8B5CF6',
  badge_emoji TEXT DEFAULT '🏛️',
  total_earnings NUMERIC(14,2) DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  weekly_earnings NUMERIC(14,2) DEFAULT 0,
  max_members INTEGER DEFAULT 10,
  is_open BOOLEAN DEFAULT true,  -- open to join vs invite-only
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guild_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- leader | officer | member
  earnings_contributed NUMERIC(14,2) DEFAULT 0,
  tasks_contributed INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(guild_id, user_id)
);

-- Add guild_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guild_id UUID REFERENCES public.guilds(id);

-- -------------------------------------------------------
-- 6. CERTIFICATES TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.profiles(id),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  certificate_number TEXT NOT NULL UNIQUE,
  item_title TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  gps_latitude NUMERIC(12,8),
  gps_longitude NUMERIC(12,8),
  verified_at TIMESTAMPTZ NOT NULL,
  vouchscore_at_time NUMERIC(5,2),
  ai_analysis_score NUMERIC(5,2),
  checklist_summary JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id)
);

-- -------------------------------------------------------
-- 7. VC TRANSACTIONS (credit/debit ledger)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vc_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- positive = credit, negative = debit
  type TEXT NOT NULL,       -- streak_bonus | referral | milestone | spend_feature | spend_express | spend_certificate | convert_to_naira | first_deposit_bonus | task_completion
  description TEXT,
  task_id UUID REFERENCES public.tasks(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------
-- 8. MILESTONES TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,  -- first_task | ten_tasks | fifty_tasks | hundred_tasks | first_pro | first_flash | etc.
  achieved_at TIMESTAMPTZ DEFAULT now(),
  vc_reward INTEGER DEFAULT 0,
  naira_reward NUMERIC(12,2) DEFAULT 0,
  UNIQUE(user_id, milestone_key)
);

-- -------------------------------------------------------
-- 9. VOUCHSCORE™ RECALCULATION FUNCTION
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_vouchscore(p_voucher_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_completion_rate NUMERIC := 0;
  v_avg_rating NUMERIC := 0;
  v_gps_score NUMERIC := 0;
  v_speed_score NUMERIC := 0;
  v_dispute_penalty NUMERIC := 0;
  v_total_tasks INTEGER := 0;
  v_completed_tasks INTEGER := 0;
  v_disputed_tasks INTEGER := 0;
  v_final_score NUMERIC := 0;
  v_level TEXT := 'bronze';
  v_breakdown JSONB;
BEGIN
  -- Total tasks assigned to voucher
  SELECT COUNT(*) INTO v_total_tasks
  FROM public.tasks
  WHERE voucher_id = p_voucher_id
    AND status IN ('assigned', 'pending_review', 'completed', 'disputed');

  -- Completed tasks
  SELECT COUNT(*) INTO v_completed_tasks
  FROM public.tasks
  WHERE voucher_id = p_voucher_id AND status = 'completed';

  -- Disputed tasks
  SELECT COUNT(*) INTO v_disputed_tasks
  FROM public.tasks
  WHERE voucher_id = p_voucher_id AND status = 'disputed';

  -- Completion rate (0-100)
  IF v_total_tasks > 0 THEN
    v_completion_rate := (v_completed_tasks::NUMERIC / v_total_tasks) * 100;
  ELSE
    v_completion_rate := 0;
  END IF;

  -- Average star rating from reviews (0-100 scale)
  SELECT COALESCE(AVG(r.rating), 0) * 20 INTO v_avg_rating
  FROM public.reviews r
  JOIN public.tasks t ON r.task_id = t.id
  WHERE t.voucher_id = p_voucher_id
    AND r.rating IS NOT NULL;

  -- GPS accuracy score: % of verifications within 50m (0-100)
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE
      v.gps_latitude IS NOT NULL AND t.latitude IS NOT NULL AND
      (
        6371000 * 2 * ASIN(SQRT(
          POWER(SIN((RADIANS(v.gps_latitude - t.latitude))/2), 2) +
          COS(RADIANS(t.latitude)) * COS(RADIANS(v.gps_latitude)) *
          POWER(SIN((RADIANS(v.gps_longitude - t.longitude))/2), 2)
        ))
      ) < 50
    )::NUMERIC / NULLIF(COUNT(*), 0), 0) * 100, 0
  ) INTO v_gps_score
  FROM public.verifications v
  JOIN public.tasks t ON v.task_id = t.id
  WHERE t.voucher_id = p_voucher_id;

  -- Speed score: reward faster completions (within 4 hours = 100, >24 hours = 0)
  -- Based on avg hours between task assignment and verification submission
  WITH speed_data AS (
    SELECT
      EXTRACT(EPOCH FROM (ver.submitted_at - t.updated_at)) / 3600 AS hours_taken
    FROM public.verifications ver
    JOIN public.tasks t ON ver.task_id = t.id
    WHERE t.voucher_id = p_voucher_id
      AND ver.submitted_at IS NOT NULL
      AND t.status IN ('pending_review', 'completed')
  )
  SELECT COALESCE(
    GREATEST(0, 100 - (AVG(hours_taken) - 4) * (100.0 / 20.0)),
    50
  ) INTO v_speed_score
  FROM speed_data;

  -- Dispute penalty: -5 points per dispute, min 0
  v_dispute_penalty := GREATEST(0, v_disputed_tasks * 5);

  -- Calculate weighted VouchScore (0-100)
  v_final_score := GREATEST(0, LEAST(100,
    (v_completion_rate * 0.30) +
    (v_avg_rating      * 0.25) +
    (v_gps_score       * 0.20) +
    (v_speed_score     * 0.15) +
    -- dispute penalty applied from the remaining 10% weight
    (GREATEST(0, 100 - v_dispute_penalty * 2) * 0.10)
  ));

  -- Map to level
  IF v_final_score >= 95 THEN v_level := 'elite';
  ELSIF v_final_score >= 80 THEN v_level := 'platinum';
  ELSIF v_final_score >= 60 THEN v_level := 'gold';
  ELSIF v_final_score >= 40 THEN v_level := 'silver';
  ELSE v_level := 'bronze';
  END IF;

  -- Build breakdown JSON
  v_breakdown := jsonb_build_object(
    'completion_rate', ROUND(v_completion_rate, 1),
    'avg_rating_score', ROUND(v_avg_rating, 1),
    'gps_score', ROUND(v_gps_score, 1),
    'speed_score', ROUND(v_speed_score, 1),
    'dispute_penalty', v_dispute_penalty,
    'total_tasks', v_total_tasks,
    'completed_tasks', v_completed_tasks,
    'disputed_tasks', v_disputed_tasks
  );

  -- Update profile
  UPDATE public.profiles
  SET
    vouchscore = ROUND(v_final_score, 2),
    voucher_level = v_level,
    vouchscore_breakdown = v_breakdown,
    trust_score = ROUND(v_final_score / 10.0, 2),  -- also sync old trust_score (0-10 scale)
    total_tasks_completed = v_completed_tasks,
    total_tasks_disputed = v_disputed_tasks
  WHERE id = p_voucher_id;

  RETURN ROUND(v_final_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 10. TRIGGER: recalculate VouchScore on review INSERT/UPDATE
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_recalculate_vouchscore()
RETURNS TRIGGER AS $$
DECLARE
  v_voucher_id UUID;
BEGIN
  -- Get the voucher_id from the task
  SELECT voucher_id INTO v_voucher_id
  FROM public.tasks
  WHERE id = NEW.task_id;

  IF v_voucher_id IS NOT NULL THEN
    PERFORM public.recalculate_vouchscore(v_voucher_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_vouchscore ON public.reviews;
CREATE TRIGGER on_review_vouchscore
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_vouchscore();

-- Also recalculate when task status changes to completed/disputed
CREATE OR REPLACE FUNCTION public.trigger_task_status_vouchscore()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'disputed') AND OLD.status != NEW.status THEN
    IF NEW.voucher_id IS NOT NULL THEN
      PERFORM public.recalculate_vouchscore(NEW.voucher_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_complete_vouchscore ON public.tasks;
CREATE TRIGGER on_task_complete_vouchscore
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.trigger_task_status_vouchscore();

-- -------------------------------------------------------
-- 11. AWARD VOUCH CREDITS RPC
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_vouch_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_task_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Upsert vouch_credits row
  INSERT INTO public.vouch_credits (user_id, balance, lifetime_earned)
  VALUES (p_user_id, GREATEST(0, p_amount), GREATEST(0, p_amount))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = vouch_credits.balance + p_amount,
        lifetime_earned = CASE WHEN p_amount > 0
                          THEN vouch_credits.lifetime_earned + p_amount
                          ELSE vouch_credits.lifetime_earned END,
        updated_at = now();

  -- Don't go below 0
  UPDATE public.vouch_credits
  SET balance = GREATEST(0, balance)
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO public.vc_transactions (user_id, amount, type, description, task_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_task_id);

  SELECT balance INTO v_new_balance FROM public.vouch_credits WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 12. GET MY VOUCH CREDITS RPC
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_vouch_credits()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_credits JSONB;
  v_streak JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Ensure credits row exists
  INSERT INTO public.vouch_credits (user_id, balance, lifetime_earned)
  VALUES (v_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT jsonb_build_object(
    'balance', vc.balance,
    'lifetime_earned', vc.lifetime_earned
  ) INTO v_credits
  FROM public.vouch_credits vc
  WHERE vc.user_id = v_user_id;

  SELECT jsonb_build_object(
    'current_streak', COALESCE(s.current_streak, 0),
    'longest_streak', COALESCE(s.longest_streak, 0),
    'last_activity_date', s.last_activity_date
  ) INTO v_streak
  FROM public.streaks s
  WHERE s.user_id = v_user_id AND s.streak_type = 'task_completion';

  RETURN jsonb_build_object(
    'credits', v_credits,
    'streak', COALESCE(v_streak, jsonb_build_object('current_streak', 0, 'longest_streak', 0))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 13. UPDATE STREAK + AWARD CREDITS ON TASK COMPLETION
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_streak_on_completion(p_voucher_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_vc_bonus INTEGER := 0;
BEGIN
  -- Upsert streak row
  INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_activity_date, streak_type)
  VALUES (p_voucher_id, 1, 1, v_today, 'task_completion')
  ON CONFLICT (user_id, streak_type) DO NOTHING;

  SELECT current_streak, longest_streak, last_activity_date
  INTO v_current_streak, v_longest_streak, v_last_date
  FROM public.streaks
  WHERE user_id = p_voucher_id AND streak_type = 'task_completion';

  IF v_last_date IS NULL OR v_last_date < v_today THEN
    IF v_last_date = v_today - INTERVAL '1 day' THEN
      -- Consecutive day: increment streak
      v_current_streak := v_current_streak + 1;
    ELSIF v_last_date < v_today - INTERVAL '1 day' THEN
      -- Streak broken: reset to 1
      v_current_streak := 1;
    END IF;

    v_longest_streak := GREATEST(v_current_streak, v_longest_streak);

    UPDATE public.streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = v_today,
        updated_at = now()
    WHERE user_id = p_voucher_id AND streak_type = 'task_completion';

    -- Award streak milestone credits
    IF v_current_streak = 7 THEN
      v_vc_bonus := 50;
      PERFORM public.award_vouch_credits(p_voucher_id, v_vc_bonus, 'streak_bonus', '7-day completion streak bonus!');
    ELSIF v_current_streak = 30 THEN
      v_vc_bonus := 200;
      PERFORM public.award_vouch_credits(p_voucher_id, v_vc_bonus, 'streak_bonus', '30-day completion streak bonus!');
    ELSIF v_current_streak = 100 THEN
      v_vc_bonus := 500;
      PERFORM public.award_vouch_credits(p_voucher_id, v_vc_bonus, 'streak_bonus', '100-day completion streak bonus!');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hook into task completion
CREATE OR REPLACE FUNCTION public.trigger_task_completion_rewards()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF NEW.voucher_id IS NOT NULL THEN
      -- Update streak
      PERFORM public.update_streak_on_completion(NEW.voucher_id);

      -- Award base VC (5 per task)
      PERFORM public.award_vouch_credits(
        NEW.voucher_id, 5, 'task_completion',
        'Task completion reward: ' || NEW.title,
        NEW.id
      );

      -- Flash bonus: extra 10 VC
      IF NEW.is_flash THEN
        PERFORM public.award_vouch_credits(
          NEW.voucher_id, 10, 'task_completion',
          'Flash bounty bonus!',
          NEW.id
        );
      END IF;

      -- Check task milestones
      DECLARE
        v_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_count FROM public.tasks
        WHERE voucher_id = NEW.voucher_id AND status = 'completed';

        IF v_count = 1 THEN
          INSERT INTO public.milestones (user_id, milestone_key, vc_reward)
          VALUES (NEW.voucher_id, 'first_task', 25)
          ON CONFLICT DO NOTHING;
          IF FOUND THEN
            PERFORM public.award_vouch_credits(NEW.voucher_id, 25, 'milestone', 'First task completed! 🎉');
          END IF;
        ELSIF v_count = 10 THEN
          INSERT INTO public.milestones (user_id, milestone_key, vc_reward)
          VALUES (NEW.voucher_id, 'ten_tasks', 100)
          ON CONFLICT DO NOTHING;
          IF FOUND THEN
            PERFORM public.award_vouch_credits(NEW.voucher_id, 100, 'milestone', '10 tasks completed! 🏆');
          END IF;
        ELSIF v_count = 50 THEN
          INSERT INTO public.milestones (user_id, milestone_key, vc_reward)
          VALUES (NEW.voucher_id, 'fifty_tasks', 300)
          ON CONFLICT DO NOTHING;
          IF FOUND THEN
            PERFORM public.award_vouch_credits(NEW.voucher_id, 300, 'milestone', '50 tasks completed! 💎');
          END IF;
        END IF;
      END;

      -- Update guild stats if member
      UPDATE public.guilds g
      SET total_earnings = total_earnings + NEW.bounty_amount,
          total_tasks = total_tasks + 1,
          weekly_earnings = weekly_earnings + NEW.bounty_amount,
          updated_at = now()
      FROM public.guild_members gm
      JOIN public.profiles p ON p.id = NEW.voucher_id AND p.guild_id = g.id
      WHERE gm.guild_id = g.id AND gm.user_id = NEW.voucher_id;

      -- Update guild member stats
      UPDATE public.guild_members
      SET earnings_contributed = earnings_contributed + NEW.bounty_amount,
          tasks_contributed = tasks_contributed + 1
      WHERE user_id = NEW.voucher_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_completion_rewards ON public.tasks;
CREATE TRIGGER on_task_completion_rewards
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.trigger_task_completion_rewards();

-- -------------------------------------------------------
-- 14. REFERRAL CODE GENERATION ON PROFILE INSERT
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text || 'vouch' || EXTRACT(EPOCH FROM now())::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_insert_referral_code ON public.profiles;
CREATE TRIGGER on_profile_insert_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- -------------------------------------------------------
-- 15. CLAIM REFERRAL RPC
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_referral(p_referral_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_referrer_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find referrer
  SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = p_referral_code;
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check not already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed a referral');
  END IF;

  -- Insert referral
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
  VALUES (v_referrer_id, v_user_id, p_referral_code, 'activated');

  -- Update referred_by on profile
  UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = v_user_id;

  -- Award referrer: 100 VC + ₦500 (via notification, payout handled separately)
  PERFORM public.award_vouch_credits(v_referrer_id, 100, 'referral', 'Referral reward for ' || p_referral_code);

  -- Award referred user: 50 VC welcome bonus
  PERFORM public.award_vouch_credits(v_user_id, 50, 'referral', 'Welcome bonus! Joined via referral.');

  -- Update referral status
  UPDATE public.referrals SET status = 'rewarded', rewarded_at = now()
  WHERE referrer_id = v_referrer_id AND referred_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Referral activated! You both earned bonus credits.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 16. CONVERT VC TO NAIRA RPC (100 VC = ₦50)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_vc_to_naira(p_vc_amount INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_vc INTEGER;
  v_naira_amount NUMERIC(12,2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_vc_amount < 100 OR p_vc_amount % 100 != 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must convert in multiples of 100 VC');
  END IF;

  SELECT balance INTO v_current_vc FROM public.vouch_credits WHERE user_id = v_user_id;
  IF v_current_vc IS NULL OR v_current_vc < p_vc_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient VC balance');
  END IF;

  v_naira_amount := (p_vc_amount / 100.0) * 50.0;

  -- Deduct VC
  PERFORM public.award_vouch_credits(v_user_id, -p_vc_amount, 'convert_to_naira',
    'Converted ' || p_vc_amount || ' VC → ₦' || v_naira_amount);

  -- Add Naira via secure add_funds
  PERFORM public.add_funds_secure(v_naira_amount, 'VC conversion: ' || p_vc_amount || ' VC');

  RETURN jsonb_build_object(
    'success', true,
    'vc_spent', p_vc_amount,
    'naira_added', v_naira_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 17. GUILD LEADERBOARD RPC
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guild_leaderboard()
RETURNS TABLE (
  guild_id UUID,
  name TEXT,
  badge_emoji TEXT,
  badge_color TEXT,
  total_earnings NUMERIC,
  total_tasks INTEGER,
  weekly_earnings NUMERIC,
  member_count INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.badge_emoji,
    g.badge_color,
    g.total_earnings,
    g.total_tasks,
    g.weekly_earnings,
    g.member_count,
    ROW_NUMBER() OVER (ORDER BY g.weekly_earnings DESC) AS rank
  FROM public.guilds g
  ORDER BY g.weekly_earnings DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 18. VOUCHER LEADERBOARD RPC
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_voucher_leaderboard()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  vouchscore NUMERIC,
  voucher_level TEXT,
  total_tasks_completed INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.vouchscore,
    p.voucher_level,
    p.total_tasks_completed,
    ROW_NUMBER() OVER (ORDER BY p.vouchscore DESC) AS rank
  FROM public.profiles p
  WHERE p.vouchscore > 0
  ORDER BY p.vouchscore DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 19. RLS POLICIES
-- -------------------------------------------------------
ALTER TABLE public.vouch_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- vouch_credits: user sees own
CREATE POLICY "vouch_credits_self" ON public.vouch_credits FOR ALL
  USING (auth.uid() = user_id);

-- streaks: user sees own
CREATE POLICY "streaks_self" ON public.streaks FOR ALL
  USING (auth.uid() = user_id);

-- vc_transactions: user sees own
CREATE POLICY "vc_transactions_self" ON public.vc_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- milestones: user sees own
CREATE POLICY "milestones_self" ON public.milestones FOR SELECT
  USING (auth.uid() = user_id);

-- guilds: everyone can read
CREATE POLICY "guilds_read" ON public.guilds FOR SELECT TO authenticated USING (true);
CREATE POLICY "guilds_insert" ON public.guilds FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "guilds_update" ON public.guilds FOR UPDATE TO authenticated
  USING (auth.uid() = leader_id);

-- guild_members: authenticated read
CREATE POLICY "guild_members_read" ON public.guild_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "guild_members_insert" ON public.guild_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "guild_members_delete" ON public.guild_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- certificates: task requester and voucher can read
CREATE POLICY "certificates_read" ON public.certificates FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = voucher_id);

-- referrals: user sees own referrals
CREATE POLICY "referrals_self" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- -------------------------------------------------------
-- 20. GRANT EXECUTE PERMISSIONS
-- -------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.recalculate_vouchscore(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_vouch_credits(UUID, INTEGER, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_vouch_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_vc_to_naira(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guild_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_voucher_leaderboard() TO authenticated;
