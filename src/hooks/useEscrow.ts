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

  // SECURE: Uses server-side RPC function for atomic escrow operations
  const holdEscrow = async (taskId: string, requesterId: string, amount: number) => {
    if (!user) return { success: false, error: "Not authenticated" };
    
    setLoading(true);
    
    try {
      // Use secure RPC function instead of direct database operations
      const { data, error } = await supabase.rpc("hold_escrow_secure", {
        p_task_id: taskId,
        p_amount: amount,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

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

  // SECURE: Uses RPC function that hides platform_fee from vouchers
  const getEscrowStatus = async (taskId: string): Promise<EscrowTransaction | null> => {
    const { data, error } = await supabase.rpc("get_escrow_summary", {
      p_task_id: taskId,
    });

    if (error || !data) {
      return null;
    }

    // Cast to expected shape
    const result = data as {
      success?: boolean;
      id?: string;
      task_id?: string;
      requester_id?: string;
      voucher_id?: string;
      amount?: number;
      estimated_payout?: number;
      platform_fee?: number;
      status?: string;
      held_at?: string;
      released_at?: string;
      refunded_at?: string;
      notes?: string;
    };

    if (!result.success) {
      return null;
    }

    // Map the RPC response to EscrowTransaction interface
    return {
      id: result.id || "",
      task_id: result.task_id || "",
      requester_id: result.requester_id || "",
      voucher_id: result.voucher_id || null,
      amount: result.amount || result.estimated_payout || 0,
      platform_fee: result.platform_fee || 0,
      status: (result.status || "held") as 'held' | 'released' | 'refunded' | 'disputed',
      held_at: result.held_at || "",
      released_at: result.released_at || null,
      refunded_at: result.refunded_at || null,
      notes: result.notes || null,
    } as EscrowTransaction;
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
