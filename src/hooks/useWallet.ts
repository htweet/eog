import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  user_id: string;
  task_id: string | null;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'bounty_earned' | 'bounty_paid';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string | null;
  created_at: string;
}

interface WalletState {
  balance: number;
  withdrawableBalance: number;
  escrowBalance: number;
  transactions: Transaction[];
  loading: boolean;
}

export function useWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<WalletState>({
    balance: 0,
    withdrawableBalance: 0,
    escrowBalance: 0,
    transactions: [],
    loading: true,
  });

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;

    setState(prev => ({ ...prev, loading: true }));

    // Fetch balance from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance, withdrawable_balance, escrow_balance")
      .eq("id", user.id)
      .single();

    // Fetch transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setState({
      balance: profile?.wallet_balance || 0,
      withdrawableBalance: profile?.withdrawable_balance || 0,
      escrowBalance: profile?.escrow_balance || 0,
      transactions: (transactions || []) as Transaction[],
      loading: false,
    });
  };

  // SECURE: Uses server-side RPC function with atomic operations
  const addFunds = async (amount: number, description?: string) => {
    if (!user || amount <= 0) return { success: false };

    try {
      const { data, error } = await supabase.rpc("add_funds_secure", {
        p_amount: amount,
        p_description: description || `Added ₦${amount.toFixed(2)} to wallet`,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to add funds",
          variant: "destructive",
        });
        return { success: false };
      }

      toast({
        title: "Funds Added",
        description: `₦${amount.toLocaleString()} has been added to your wallet`,
      });

      await fetchWalletData();
      return { success: true };
    } catch (error) {
      console.error("Error adding funds:", error);
      toast({
        title: "Error",
        description: "Failed to add funds",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // SECURE: Uses server-side RPC function with atomic operations
  const withdrawFunds = async (
    amount: number, 
    bankName: string, 
    accountNumber: string, 
    accountName: string
  ) => {
    if (!user || amount <= 0) {
      toast({
        title: "Error",
        description: "Invalid withdrawal amount",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const { data, error } = await supabase.rpc("withdraw_funds_secure", {
        p_amount: amount,
        p_bank_name: bankName,
        p_account_number: accountNumber,
        p_account_name: accountName,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to process withdrawal",
          variant: "destructive",
        });
        return { success: false };
      }

      toast({
        title: "Withdrawal Requested",
        description: `₦${amount.toLocaleString()} withdrawal is being processed`,
      });

      await fetchWalletData();
      return { success: true };
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      toast({
        title: "Error",
        description: "Failed to process withdrawal",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // SECURE: Uses server-side RPC function with atomic operations
  const holdEscrow = async (taskId: string, amount: number) => {
    if (!user || amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    try {
      const { data, error } = await supabase.rpc("hold_escrow_secure", {
        p_task_id: taskId,
        p_amount: amount,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      await fetchWalletData();
      return { success: true };
    } catch (error) {
      console.error("Error holding escrow:", error);
      return { success: false, error: "Failed to hold escrow" };
    }
  };

  // SECURE: Uses existing release_escrow database function
  const releaseEscrow = async (taskId: string, voucherId: string) => {
    if (!user) return { success: false };

    try {
      const { data, error } = await supabase.rpc("release_escrow", {
        p_task_id: taskId,
        p_voucher_id: voucherId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      await fetchWalletData();
      return { success: true };
    } catch (error) {
      console.error("Error releasing escrow:", error);
      return { success: false };
    }
  };

  return {
    ...state,
    addFunds,
    withdrawFunds,
    holdEscrow,
    releaseEscrow,
    refetch: fetchWalletData,
  };
}
