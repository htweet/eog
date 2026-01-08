import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: 'task_claimed' | 'verification_submitted' | 'payment_received' | 'task_disputed' | 'task_completed' | 'welcome';
  data: {
    userName?: string;
    taskTitle?: string;
    bountyAmount?: number;
    voucherName?: string;
    disputeReason?: string;
  };
}

const getEmailContent = (type: EmailRequest['type'], data: EmailRequest['data']) => {
  switch (type) {
    case 'welcome':
      return {
        subject: 'Welcome to VouchSafe!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0ea5e9;">Welcome to VouchSafe!</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>Thank you for joining VouchSafe! We're excited to have you on board.</p>
            <p>VouchSafe connects requesters who need items verified with local vouchers who can help.</p>
            <p style="margin-top: 30px;">Ready to get started?</p>
            <a href="https://vouchsafe.app" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">Explore Tasks</a>
            <p style="margin-top: 30px; color: #666;">Best regards,<br>The VouchSafe Team</p>
          </div>
        `,
      };
    case 'task_claimed':
      return {
        subject: `Your task "${data.taskTitle}" has been claimed!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0ea5e9;">Task Claimed!</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>Great news! Your verification task <strong>"${data.taskTitle}"</strong> has been claimed by <strong>${data.voucherName || 'a voucher'}</strong>.</p>
            <p>They will visit the location and submit their verification video soon.</p>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Bounty:</strong> $${data.bountyAmount?.toFixed(2)}</p>
            </div>
            <p>You'll receive another email once the verification is submitted for your review.</p>
            <p style="margin-top: 30px; color: #666;">Best regards,<br>The VouchSafe Team</p>
          </div>
        `,
      };
    case 'verification_submitted':
      return {
        subject: `Verification submitted for "${data.taskTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0ea5e9;">Verification Ready for Review!</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>The voucher has submitted their verification video for <strong>"${data.taskTitle}"</strong>.</p>
            <p>Please review the submission and approve or dispute it.</p>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Bounty at stake:</strong> $${data.bountyAmount?.toFixed(2)}</p>
            </div>
            <a href="https://vouchsafe.app" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">Review Now</a>
            <p style="margin-top: 30px; color: #666;">Best regards,<br>The VouchSafe Team</p>
          </div>
        `,
      };
    case 'payment_received':
      return {
        subject: `You earned $${data.bountyAmount?.toFixed(2)}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Payment Received! 🎉</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>Congratulations! You've earned <strong>$${data.bountyAmount?.toFixed(2)}</strong> for completing the task <strong>"${data.taskTitle}"</strong>.</p>
            <p>The funds have been added to your wallet balance.</p>
            <a href="https://vouchsafe.app/wallet" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">View Wallet</a>
            <p style="margin-top: 30px; color: #666;">Best regards,<br>The VouchSafe Team</p>
          </div>
        `,
      };
    case 'task_disputed':
      return {
        subject: `Task "${data.taskTitle}" has been disputed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Task Disputed</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>Unfortunately, your verification for <strong>"${data.taskTitle}"</strong> has been disputed by the requester.</p>
            ${data.disputeReason ? `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;"><p style="margin: 0;"><strong>Reason:</strong> ${data.disputeReason}</p></div>` : ''}
            <p>Our team will review the dispute and reach out if needed.</p>
            <p style="margin-top: 30px; color: #666;">Best regards,<br>The VouchSafe Team</p>
          </div>
        `,
      };
    case 'task_completed':
      return {
        subject: `Task "${data.taskTitle}" completed successfully!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #22c55e;">Task Completed! ✓</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>Your task <strong>"${data.taskTitle}"</strong> has been successfully verified and completed.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Bounty paid:</strong> $${data.bountyAmount?.toFixed(2)}</p>
            </div>
            <p>Thank you for using VouchSafe!</p>
            <a href="https://vouchsafe.app" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">Create Another Task</a>
            <p style="margin-top: 30px; color: #666;">Best regards,<br>The VouchSafe Team</p>
          </div>
        `,
      };
    default:
      return {
        subject: 'VouchSafe Notification',
        html: `<p>You have a new notification from VouchSafe.</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type, data }: EmailRequest = await req.json();

    if (!to || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, html } = getEmailContent(type, data);

    const emailResponse = await resend.emails.send({
      from: "VouchSafe <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
