import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_id, expected_amount, expected_currency = "NGN" } = await req.json();

    if (!transaction_id) {
      console.error("Missing transaction_id in request");
      return new Response(
        JSON.stringify({ success: false, error: "Missing transaction_id" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const flutterwaveSecretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveSecretKey) {
      console.error("FLUTTERWAVE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Verifying transaction: ${transaction_id}`);

    // Make request to Flutterwave verification endpoint
    const verifyResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();
    console.log("Flutterwave verification response:", JSON.stringify(verifyData));

    if (!verifyResponse.ok) {
      console.error("Flutterwave API error:", verifyData);
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification failed" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Critical security checks
    const paymentData = verifyData.data;
    
    // Check 1: Status must be exactly "successful"
    if (paymentData.status !== "successful") {
      console.error(`Payment status is not successful: ${paymentData.status}`);
      return new Response(
        JSON.stringify({ success: false, error: "Payment was not successful", status: paymentData.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 2: Currency must match expected currency
    if (paymentData.currency !== expected_currency) {
      console.error(`Currency mismatch: expected ${expected_currency}, got ${paymentData.currency}`);
      return new Response(
        JSON.stringify({ success: false, error: "Currency mismatch" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 3: Amount must match expected amount (if provided)
    if (expected_amount && paymentData.amount !== expected_amount) {
      console.error(`Amount mismatch: expected ${expected_amount}, got ${paymentData.amount}`);
      return new Response(
        JSON.stringify({ success: false, error: "Amount mismatch" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Payment verification successful:", {
      transaction_id: paymentData.id,
      tx_ref: paymentData.tx_ref,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentData.status,
    });

    // All checks passed
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transaction_id: paymentData.id,
          tx_ref: paymentData.tx_ref,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentData.status,
          customer_email: paymentData.customer?.email,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
