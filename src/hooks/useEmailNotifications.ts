import { supabase } from "@/integrations/supabase/client";

type EmailType = 'task_claimed' | 'verification_submitted' | 'payment_received' | 'task_disputed' | 'task_completed' | 'welcome';

interface EmailData {
  userName?: string;
  taskTitle?: string;
  bountyAmount?: number;
  voucherName?: string;
  disputeReason?: string;
}

export async function sendNotificationEmail(
  to: string,
  type: EmailType,
  data: EmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke('send-notification-email', {
      body: { to, type, data },
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Helper to get user email from auth
export async function getUserEmailFromAuth(userId: string): Promise<string | null> {
  // We need to get this from a profile or notification context
  // This would typically be called from an edge function with service role
  return null;
}

// Send task claimed notification
export async function notifyTaskClaimed(
  requesterEmail: string,
  requesterName: string,
  taskTitle: string,
  bountyAmount: number,
  voucherName: string
) {
  return sendNotificationEmail(requesterEmail, 'task_claimed', {
    userName: requesterName,
    taskTitle,
    bountyAmount,
    voucherName,
  });
}

// Send verification submitted notification
export async function notifyVerificationSubmitted(
  requesterEmail: string,
  requesterName: string,
  taskTitle: string,
  bountyAmount: number
) {
  return sendNotificationEmail(requesterEmail, 'verification_submitted', {
    userName: requesterName,
    taskTitle,
    bountyAmount,
  });
}

// Send payment received notification
export async function notifyPaymentReceived(
  voucherEmail: string,
  voucherName: string,
  taskTitle: string,
  bountyAmount: number
) {
  return sendNotificationEmail(voucherEmail, 'payment_received', {
    userName: voucherName,
    taskTitle,
    bountyAmount,
  });
}

// Send task disputed notification
export async function notifyTaskDisputed(
  voucherEmail: string,
  voucherName: string,
  taskTitle: string,
  disputeReason: string
) {
  return sendNotificationEmail(voucherEmail, 'task_disputed', {
    userName: voucherName,
    taskTitle,
    disputeReason,
  });
}

// Send task completed notification
export async function notifyTaskCompleted(
  requesterEmail: string,
  requesterName: string,
  taskTitle: string,
  bountyAmount: number
) {
  return sendNotificationEmail(requesterEmail, 'task_completed', {
    userName: requesterName,
    taskTitle,
    bountyAmount,
  });
}
