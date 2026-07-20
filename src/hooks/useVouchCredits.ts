import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VouchCreditsData {
  balance: number;
  lifetime_earned: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface VCTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface Milestone {
  milestone_key: string;
  achieved_at: string;
  vc_reward: number;
}

export function useVouchCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<VouchCreditsData>({ balance: 0, lifetime_earned: 0 });
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_activity_date: null });
  const [transactions, setTransactions] = useState<VCTransaction[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    const [creditsRes, txRes, milestonesRes, profileRes, referralsRes] = await Promise.all([
      supabase.rpc("get_my_vouch_credits"),
      supabase.from("vc_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("milestones").select("*").eq("user_id", user.id).order("achieved_at", { ascending: false }),
      supabase.from("profiles").select("referral_code").eq("id", user.id).single(),
      supabase.from("referrals").select("id").eq("referrer_id", user.id),
    ]);

    if (creditsRes.data) {
      const d = creditsRes.data as any;
      setCredits(d.credits || { balance: 0, lifetime_earned: 0 });
      setStreak(d.streak || { current_streak: 0, longest_streak: 0, last_activity_date: null });
    }

    setTransactions((txRes.data || []) as VCTransaction[]);
    setMilestones((milestonesRes.data || []) as Milestone[]);
    setReferralCode(profileRes.data?.referral_code || "");
    setReferralCount((referralsRes.data || []).length);

    setLoading(false);
  };

  const convertToNaira = async (vcAmount: number) => {
    if (vcAmount < 100 || vcAmount % 100 !== 0) return { success: false, error: "Must convert in multiples of 100 VC" };
    const { data, error } = await supabase.rpc("convert_vc_to_naira", { p_vc_amount: vcAmount });
    if (error) return { success: false, error: error.message };
    await fetchAll();
    return data as any;
  };

  const claimReferral = async (code: string) => {
    const { data, error } = await supabase.rpc("claim_referral", { p_referral_code: code.toUpperCase() });
    if (error) return { success: false, error: error.message };
    await fetchAll();
    return data as any;
  };

  return { credits, streak, transactions, milestones, referralCode, referralCount, loading, convertToNaira, claimReferral, refetch: fetchAll };
}
