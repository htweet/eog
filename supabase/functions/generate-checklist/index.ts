import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, category, description } = await req.json();

    const prompt = `You are an expert at creating verification checklists for physical item inspections.

Generate a detailed checklist for verifying the following item:
- Title: ${title}
- Category: ${category}
- Description: ${description || "No additional description provided"}

Create 5-8 specific, actionable checklist items that a verifier should check and document. Each item should be something that can be visually confirmed and recorded on video.

For ${category} items, focus on:
${category === "auto" ? "- Exterior condition (body, paint, tires)\n- Interior condition (seats, dashboard, odometer)\n- Engine bay inspection\n- VIN verification\n- Functionality checks (lights, horn, wipers)" : ""}
${category === "realestate" ? "- Exterior condition (roof, walls, foundation)\n- Interior condition (walls, floors, fixtures)\n- Kitchen and bathroom condition\n- Utilities check (water, electricity)\n- Property boundaries and features" : ""}
${category === "electronics" ? "- Physical condition (screen, body, ports)\n- Power on and functionality\n- Serial number verification\n- All accessories present\n- Feature testing" : ""}
${category === "general" ? "- Physical condition\n- Functionality check\n- Completeness (all parts present)\n- Authenticity verification\n- Documentation check" : ""}

Return ONLY a JSON array of checklist items, each with "id" (number), "label" (string), and "required" (boolean). Example:
[{"id": 1, "label": "Verify the item is present at the specified location", "required": true}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "[]";
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const checklist = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ checklist }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating checklist:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, checklist: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
