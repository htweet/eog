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
  transactions: Transaction[];
  loading: boolean;
}

export function useWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<WalletState>({
    balance: 0,
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
      .select("wallet_balance")
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
      transactions: (transactions || []) as Transaction[],
      loading: false,
    });
  };

  const addFunds = async (amount: number) => {
    if (!user || amount <= 0) return { success: false };

    try {
      // Create transaction record
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "deposit",
          amount,
          status: "completed",
          description: `Added $${amount.toFixed(2)} to wallet`,
        });

      if (txError) throw txError;

      // Update balance
      const newBalance = state.balance + amount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Funds Added",
        description: `$${amount.toFixed(2)} has been added to your wallet`,
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

  const withdrawFunds = async (amount: number) => {
    if (!user || amount <= 0 || amount > state.balance) {
      toast({
        title: "Error",
        description: "Insufficient balance or invalid amount",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      // Create transaction record
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "withdrawal",
          amount: -amount,
          status: "pending",
          description: `Withdrawal of $${amount.toFixed(2)} requested`,
        });

      if (txError) throw txError;

      // Update balance
      const newBalance = state.balance - amount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Withdrawal Requested",
        description: `$${amount.toFixed(2)} withdrawal is being processed`,
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

  const holdEscrow = async (taskId: string, amount: number) => {
    if (!user || amount <= 0 || amount > state.balance) {
      return { success: false, error: "Insufficient balance" };
    }

    try {
      // Create escrow hold transaction
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          task_id: taskId,
          type: "escrow_hold",
          amount: -amount,
          status: "completed",
          description: `Bounty escrow for task`,
        });

      if (txError) throw txError;

      // Deduct from balance
      const newBalance = state.balance - amount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await fetchWalletData();
      return { success: true };
    } catch (error) {
      console.error("Error holding escrow:", error);
      return { success: false, error: "Failed to hold escrow" };
    }
  };

  const releaseEscrow = async (taskId: string, voucherId: string, amount: number) => {
    if (!user) return { success: false };

    try {
      // Create release transaction for requester
      await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          task_id: taskId,
          type: "bounty_paid",
          amount: -amount,
          status: "completed",
          description: `Bounty paid for completed task`,
        });

      // Create earning transaction for voucher
      await supabase
        .from("transactions")
        .insert({
          user_id: voucherId,
          task_id: taskId,
          type: "bounty_earned",
          amount: amount,
          status: "completed",
          description: `Bounty earned for completing task`,
        });

      // Update voucher's balance
      const { data: voucherProfile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", voucherId)
        .single();

      if (voucherProfile) {
        await supabase
          .from("profiles")
          .update({ wallet_balance: (voucherProfile.wallet_balance || 0) + amount })
          .eq("id", voucherId);
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
