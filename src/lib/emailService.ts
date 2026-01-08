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

// Helper function to get user email from profile
export async function getUserEmail(userId: string): Promise<string | null> {
  // Since we don't store email in profiles, we can't directly get it
  // In a real app, you'd store email in the profiles table
  // For now, we'll return null and handle it gracefully
  return null;
}
