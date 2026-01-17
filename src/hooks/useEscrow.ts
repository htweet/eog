import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EscrowTransaction {
  id: string;
  task_id: string;
  requester_id: string;
  voucher_id: string | null;
  amount: number;
  platform_fee: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  held_at: string;
  released_at: string | null;
  refunded_at: string | null;
  notes: string | null;
}

interface PlatformSettings {
  platform_fee_percent: number;
  pro_fee_multiplier: number;
  min_bounty_amount: number;
  max_bounty_amount: number;
  enable_pro_mode: boolean;
  enable_escrow: boolean;
}

export function useEscrow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("setting_key, setting_value");

    if (data) {
      const settingsMap: Record<string, any> = {};
      data.forEach((row: any) => {
        const value = row.setting_value;
        // Parse value based on key type
        if (["enable_pro_mode", "enable_escrow"].includes(row.setting_key)) {
          settingsMap[row.setting_key] = value === "true" || value === true;
        } else {
          settingsMap[row.setting_key] = parseFloat(value) || value;
        }
      });
      setSettings(settingsMap as PlatformSettings);
    }
  };

  const holdEscrow = async (taskId: string, requesterId: string, amount: number) => {
    if (!user) return { success: false, error: "Not authenticated" };
    
    setLoading(true);
    
    try {
      // Get current wallet balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", requesterId)
        .single();

      if (!profile || (profile.wallet_balance || 0) < amount) {
        return { success: false, error: "Insufficient balance" };
      }

      // Create escrow transaction
      const { error: escrowError } = await supabase
        .from("escrow_transactions")
        .insert({
          task_id: taskId,
          requester_id: requesterId,
          amount,
          status: "held",
        } as any);

      if (escrowError) throw escrowError;

      // Deduct from wallet, add to escrow balance
      const newBalance = (profile.wallet_balance || 0) - amount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          wallet_balance: newBalance,
          escrow_balance: amount 
        })
        .eq("id", requesterId);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: requesterId,
        task_id: taskId,
        type: "escrow_hold",
        amount: -amount,
        status: "completed",
        description: `Bounty held in escrow for task`,
      });

      return { success: true };
    } catch (error) {
      console.error("Error holding escrow:", error);
      return { success: false, error: "Failed to hold escrow" };
    } finally {
      setLoading(false);
    }
  };

  const releaseEscrow = async (taskId: string, voucherId: string) => {
    if (!user) return { success: false, error: "Not authenticated" };
    
    setLoading(true);
    
    try {
      // Call the database function to release escrow
      const { data, error } = await supabase.rpc("release_escrow", {
        p_task_id: taskId,
        p_voucher_id: voucherId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number; platform_fee?: number; voucher_payout?: number };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      toast({
        title: "Escrow Released",
        description: `₦${result.voucher_payout?.toLocaleString()} paid to voucher (${settings?.platform_fee_percent || 10}% platform fee deducted)`,
      });

      return { success: true, data: result };
    } catch (error) {
      console.error("Error releasing escrow:", error);
      return { success: false, error: "Failed to release escrow" };
    } finally {
      setLoading(false);
    }
  };

  const refundEscrow = async (taskId: string, reason: string = "Task cancelled") => {
    if (!user) return { success: false, error: "Not authenticated" };
    
    setLoading(true);
    
    try {
      // Call the database function to refund escrow
      const { data, error } = await supabase.rpc("refund_escrow", {
        p_task_id: taskId,
        p_reason: reason,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      toast({
        title: "Escrow Refunded",
        description: `₦${result.amount?.toLocaleString()} returned to wallet`,
      });

      return { success: true, data: result };
    } catch (error) {
      console.error("Error refunding escrow:", error);
      return { success: false, error: "Failed to refund escrow" };
    } finally {
      setLoading(false);
    }
  };

  const getEscrowStatus = async (taskId: string): Promise<EscrowTransaction | null> => {
    const { data } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data as EscrowTransaction | null;
  };

  const calculateProFee = (baseAmount: number): number => {
    const multiplier = settings?.pro_fee_multiplier || 1.4;
    return baseAmount * multiplier;
  };

  return {
    loading,
    settings,
    holdEscrow,
    releaseEscrow,
    refundEscrow,
    getEscrowStatus,
    calculateProFee,
    refetchSettings: fetchSettings,
  };
}
