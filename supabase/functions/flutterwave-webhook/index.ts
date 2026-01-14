import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, verif-hash',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security Check: Validate webhook signature
    const verifHash = req.headers.get("verif-hash");
    const expectedHash = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");

    if (!expectedHash) {
      console.error("FLUTTERWAVE_WEBHOOK_HASH not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (verifHash !== expectedHash) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log("Webhook signature verified");

    // Parse the webhook payload
    const payload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));

    const { event, data } = payload;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle charge.completed event
    if (event === "charge.completed" && data.status === "successful") {
      console.log("Processing successful payment:", {
        tx_ref: data.tx_ref,
        transaction_id: data.id,
        amount: data.amount,
        currency: data.currency,
      });

      // Extract user_id from tx_ref if it contains it (format: tx_ref_timestamp_userId)
      const txRefParts = data.tx_ref?.split("_") || [];
      const userId = txRefParts.length >= 3 ? txRefParts[txRefParts.length - 1] : null;

      // Try to find existing transaction by tx_ref
      const { data: existingTransaction } = await supabase
        .from("transactions")
        .select("*")
        .eq("description", `Flutterwave deposit - ${data.tx_ref}`)
        .maybeSingle();

      if (existingTransaction) {
        console.log("Transaction already processed:", existingTransaction.id);
        return new Response(
          JSON.stringify({ message: "Transaction already processed" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // If we have a user_id from tx_ref, update their wallet
      if (userId) {
        // Get current balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", userId)
          .single();

        if (profile) {
          const currentBalance = profile.wallet_balance || 0;
          const newBalance = currentBalance + data.amount;

          // Update wallet balance
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ wallet_balance: newBalance })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating wallet balance:", updateError);
          } else {
            console.log(`Updated wallet balance for user ${userId}: ${currentBalance} -> ${newBalance}`);
          }

          // Record the transaction
          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              user_id: userId,
              type: "deposit",
              amount: data.amount,
              status: "completed",
              description: `Flutterwave deposit - ${data.tx_ref}`,
            });

          if (transactionError) {
            console.error("Error recording transaction:", transactionError);
          } else {
            console.log("Transaction recorded successfully");
          }

          // Create notification for user
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "payment_received",
            title: "Deposit Successful",
            message: `Your deposit of ${data.currency} ${data.amount} has been credited to your wallet.`,
          });
        }
      }

      console.log("Webhook processed successfully");
      return new Response(
        JSON.stringify({ message: "Webhook processed successfully" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Handle other event types
    console.log(`Unhandled event type: ${event}`);
    return new Response(
      JSON.stringify({ message: "Event received" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
