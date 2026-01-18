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

  // SECURE: Uses server-side RPC function for atomic refund operations
  const refundEscrow = async (
    taskId: string,
    reason: string = "Task cancelled - escrow refunded"
  ): Promise<RefundResult> => {
    setProcessing(true);

    try {
      // Call the secure database function to refund escrow
      const { data, error } = await supabase.rpc("refund_escrow", {
        p_task_id: taskId,
        p_reason: reason,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; amount?: number };
      
      if (!result.success) {
        toast({
          title: "Refund Failed",
          description: result.error || "Could not process the refund",
          variant: "destructive",
        });
        setProcessing(false);
        return { success: false, error: result.error };
      }

      toast({
        title: "Refund Processed",
        description: `₦${result.amount?.toLocaleString()} has been refunded`,
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
        return { success: false, error: "Task not found" };
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

      // Process the refund using secure RPC
      return await refundEscrow(taskId, reason || "Task cancelled by requester");
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
        setProcessing(false);
        return { success: false, error: "Task not found or unauthorized" };
      }

      // Only allow cancellation of open or assigned tasks
      if (!["open", "assigned"].includes(task.status || "")) {
        setProcessing(false);
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

      // Refund the escrow using secure RPC
      const refundResult = await refundEscrow(taskId, "Task cancelled - full refund");

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
