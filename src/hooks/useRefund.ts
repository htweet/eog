import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefundResult {
  success: boolean;
  error?: string;
}

export function useRefund() {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const refundEscrow = async (
    taskId: string,
    requesterId: string,
    amount: number,
    reason: string = "Task cancelled - escrow refunded"
  ): Promise<RefundResult> => {
    setProcessing(true);

    try {
      // Get requester's current balance
      const { data: requesterProfile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", requesterId)
        .single();

      if (profileError) throw profileError;

      // Create refund transaction
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: requesterId,
        task_id: taskId,
        type: "escrow_release",
        amount: amount,
        status: "completed",
        description: reason,
      });

      if (txError) throw txError;

      // Update requester's balance
      const newBalance = (requesterProfile?.wallet_balance || 0) + amount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", requesterId);

      if (updateError) throw updateError;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: requesterId,
        type: "refund",
        title: "Escrow Refunded",
        message: `$${amount.toFixed(2)} has been refunded to your wallet. ${reason}`,
        task_id: taskId,
      });

      toast({
        title: "Refund Processed",
        description: `$${amount.toFixed(2)} has been refunded to the requester`,
      });

      setProcessing(false);
      return { success: true };
    } catch (error) {
      console.error("Error processing refund:", error);
      toast({
        title: "Refund Failed",
        description: "Could not process the refund. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
      return { success: false, error: "Failed to process refund" };
    }
  };

  const requestRefund = async (
    taskId: string,
    requesterId: string,
    reason: string
  ): Promise<RefundResult> => {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError || !task) {
        throw new Error("Task not found");
      }

      // Check if task is eligible for refund
      if (!["open", "assigned"].includes(task.status || "")) {
        return {
          success: false,
          error: "Task is not eligible for refund at this stage",
        };
      }

      // Update task status to cancelled
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "cancelled" })
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Process the refund
      return await refundEscrow(
        taskId,
        requesterId,
        task.bounty_amount,
        reason || "Task cancelled by requester"
      );
    } catch (error) {
      console.error("Error requesting refund:", error);
      return { success: false, error: "Failed to request refund" };
    }
  };

  const cancelTask = async (taskId: string, requesterId: string): Promise<RefundResult> => {
    setProcessing(true);

    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("requester_id", requesterId)
        .single();

      if (taskError || !task) {
        throw new Error("Task not found or unauthorized");
      }

      // Only allow cancellation of open or assigned tasks
      if (!["open", "assigned"].includes(task.status || "")) {
        return {
          success: false,
          error: "Cannot cancel task in its current state",
        };
      }

      // If task is assigned, notify the voucher
      if (task.voucher_id) {
        await supabase.from("notifications").insert({
          user_id: task.voucher_id,
          type: "task_cancelled",
          title: "Task Cancelled",
          message: `The task "${task.title}" has been cancelled by the requester.`,
          task_id: taskId,
        });
      }

      // Update task status
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "cancelled", voucher_id: null })
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Refund the escrow
      const refundResult = await refundEscrow(
        taskId,
        requesterId,
        task.bounty_amount,
        "Task cancelled - full refund"
      );

      setProcessing(false);
      return refundResult;
    } catch (error) {
      console.error("Error cancelling task:", error);
      setProcessing(false);
      return { success: false, error: "Failed to cancel task" };
    }
  };

  return {
    refundEscrow,
    requestRefund,
    cancelTask,
    processing,
  };
}
