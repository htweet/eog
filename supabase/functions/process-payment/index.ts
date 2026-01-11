import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency = "NGN", redirect_url } = await req.json();

    // Validate required fields
    if (!email || !name || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name, amount" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error("FLUTTERWAVE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transaction reference
    const tx_ref = `VV-${crypto.randomUUID()}`;

    const payload = {
      tx_ref,
      amount: Number(amount),
      currency,
      redirect_url,
      customer: {
        email,
        name,
      },
      customizations: {
        title: "VouchVault",
        description: "Add funds to your wallet",
        logo: "https://jiemgpawjuranlfvmpad.supabase.co/storage/v1/object/public/assets/logo.png"
      }
    };

    console.log("Initiating Flutterwave payment:", { tx_ref, amount, currency, email });

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status === 'success' && data.data?.link) {
      console.log("Payment link generated successfully:", data.data.link);
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_link: data.data.link,
          tx_ref 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Flutterwave error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Failed to initialize payment" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
