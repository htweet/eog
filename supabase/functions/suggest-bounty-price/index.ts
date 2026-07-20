import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_PRICES: Record<string, { min: number; max: number }> = {
  auto: { min: 2000, max: 5000 },
  realestate: { min: 3000, max: 8000 },
  electronics: { min: 1500, max: 4000 },
  general: { min: 1000, max: 3000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, category, description, city } = await req.json();

    const fallback = FALLBACK_PRICES[category] || FALLBACK_PRICES.general;
    const cityNote = city ? `in ${city}, Nigeria` : "in Nigeria";

    const prompt = `You are a pricing expert for a peer-to-peer physical verification marketplace ${cityNote}.

A user wants to hire a local agent (called a "Voucher") to physically visit a location and record a live video inspection of the following item:

Title: ${title}
Category: ${category}
Description: ${description || "No additional description provided"}

Your job is to suggest a fair bounty price range (in Nigerian Naira ₦) that the requester should pay the Voucher.

Consider:
- Travel costs and time for the Voucher (typically a 20-30 minute trip)
- Complexity of the inspection (e.g., cars require more detailed checks than small electronics)
- Risk to the Voucher (checking a house vs. a phone)
- Nigerian gig economy rates (unskilled: ₦1,000–2,000/hr, skilled: ₦3,000–8,000/hr)
- Typical bounty ranges: Electronics ₦1,500–4,000, General ₦1,000–3,000, Cars ₦2,000–6,000, Real Estate ₦3,000–10,000
- Premium for Pro-verified agents or high-value items

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"min": 2000, "max": 5000, "reasoning": "Short 1-sentence reason for this range"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI Gateway error:", await response.text());
      return new Response(
        JSON.stringify({ ...fallback, reasoning: "Suggested price based on category average" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    const min = typeof result.min === "number" ? Math.round(result.min) : fallback.min;
    const max = typeof result.max === "number" ? Math.round(result.max) : fallback.max;
    const reasoning = typeof result.reasoning === "string" ? result.reasoning : "";

    return new Response(
      JSON.stringify({ min, max, reasoning }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error suggesting price:", error);
    const { category } = await (async () => {
      try { return await new Request(req.url).json(); } catch { return { category: "general" }; }
    })();
    const fallback = FALLBACK_PRICES[category] || FALLBACK_PRICES.general;
    return new Response(
      JSON.stringify({ ...fallback, reasoning: "Suggested price based on category average" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
