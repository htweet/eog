import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TaskPayload {
  id: string;
  title: string;
  status: string;
  bounty_amount: number;
  requester_id: string;
  voucher_id: string | null;
}

export function useRealtimeTaskNotifications() {
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('task-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const newTask = payload.new as TaskPayload;
          const oldTask = payload.old as TaskPayload;

          // Only notify if user is involved
          const isRequester = newTask.requester_id === user.id;
          const isVoucher = newTask.voucher_id === user.id;
          const wasVoucher = oldTask.voucher_id === user.id;

          if (!isRequester && !isVoucher && !wasVoucher) return;

          // Status changed - show notification
          if (newTask.status !== oldTask.status) {
            const statusMessages: Record<string, { title: string; description: string }> = {
              assigned: {
                title: "Task Claimed!",
                description: isRequester 
                  ? `"${newTask.title}" has been claimed by a voucher`
                  : `You've claimed "${newTask.title}"`
              },
              pending_review: {
                title: "Verification Submitted",
                description: isRequester
                  ? `"${newTask.title}" is ready for your review`
                  : `Your verification for "${newTask.title}" is being reviewed`
              },
              completed: {
                title: "Task Completed! 🎉",
                description: isVoucher
                  ? `You earned ₦${newTask.bounty_amount} for "${newTask.title}"`
                  : `"${newTask.title}" has been completed`
              },
              disputed: {
                title: "Task Disputed",
                description: `"${newTask.title}" has been marked as disputed`
              },
            };

            const message = statusMessages[newTask.status];
            if (message) {
              toast.info(message.title, {
                description: message.description,
              });
            }
          }

          // Task was assigned to this voucher
          if (!oldTask.voucher_id && newTask.voucher_id === user.id && userRole === 'voucher') {
            toast.success("Task Assigned!", {
              description: `You've been assigned to "${newTask.title}"`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);
}
