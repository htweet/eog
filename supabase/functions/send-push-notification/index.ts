import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, task_id, type } = await req.json();

    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store notification in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        task_id,
        type: type || 'general',
        is_read: false
      })
      .select()
      .single();

    if (notifError) {
      console.error("Error storing notification:", notifError);
      throw notifError;
    }

    console.log("Notification stored:", notification.id);

    // Get user's email for email notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single();

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(user_id);

    if (user?.email) {
      // Send email notification using existing edge function
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: user.email,
            subject: title,
            userName: profile?.full_name || 'User',
            notificationType: type || 'general',
            message,
            taskId: task_id
          })
        });

        if (emailResponse.ok) {
          console.log("Email notification sent to:", user.email);
        }
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
